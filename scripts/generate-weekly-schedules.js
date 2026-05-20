#!/usr/bin/env node

/**
 * scripts/generate-weekly-schedules.js
 * 
 * Script para gerar automaticamente agendamentos semanais de inventário.
 * Seleciona 10 peças por técnico usando a lógica de prioridade:
 * 1. Peças nunca contadas
 * 2. Peças contadas há mais tempo
 * 3. Seleção aleatória entre as restantes
 * 
 * Uso:
 *   node scripts/generate-weekly-schedules.js [--week YYYY-W##] [--dry-run]
 * 
 * Exemplos:
 *   node scripts/generate-weekly-schedules.js
 *   node scripts/generate-weekly-schedules.js --week 2025-W22
 *   node scripts/generate-weekly-schedules.js --dry-run
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.local ou .env
function loadEnv() {
  const envPaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
          process.env[key.trim()] = value;
        }
      });
      console.log(`✅ Variáveis carregadas de: ${envPath}`);
      return;
    }
  }
}

loadEnv();

// Validar variáveis de ambiente
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'DATABRICKS_HOST',
  'DATABRICKS_TOKEN',
  'DATABRICKS_WAREHOUSE_ID',
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error(`❌ Variáveis de ambiente faltando: ${missingVars.join(', ')}`);
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DATABRICKS_TABLE = process.env.DATABRICKS_TABLE || 'datalake_prod.indicadores_servicos.consolidacao_fiscal';

// Parsing de argumentos
const args = process.argv.slice(2);
let weekRef = null;
let dryRun = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--week' && args[i + 1]) {
    weekRef = args[i + 1];
    i++;
  }
  if (args[i] === '--dry-run') {
    dryRun = true;
  }
}

// Função para calcular week_ref ISO
function getWeekRef(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// Função para fazer requisição ao Databricks
async function runDatabricksQuery(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    const payload = {
      warehouse_id: process.env.DATABRICKS_WAREHOUSE_ID,
      statement: sql,
      parameters,
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
      wait_timeout: '0s',
      on_wait_timeout: 'CONTINUE',
    };

    const options = {
      hostname: process.env.DATABRICKS_HOST.replace(/^https?:\/\//, ''),
      path: '/api/2.0/sql/statements',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (!res.statusCode.toString().startsWith('2')) {
            reject(new Error(`Databricks error: ${json.message || json.error_code}`));
          }
          const statementId = json.statement_id;
          pollDatabricksStatus(statementId, resolve, reject);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Função para fazer polling do status da query
async function pollDatabricksStatus(statementId, resolve, reject, attempts = 0) {
  if (attempts > 30) {
    reject(new Error('Databricks query timeout'));
    return;
  }

  const options = {
    hostname: process.env.DATABRICKS_HOST.replace(/^https?:\/\//, ''),
    path: `/api/2.0/sql/statements/${statementId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}`,
    },
  };

  https.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        const state = json.status?.state;

        if (state === 'SUCCEEDED') {
          const columns = json?.manifest?.schema?.columns?.map(col => col.name.toLowerCase()) || [];
          const rows = json?.result?.data_array || [];
          const results = rows.map(row => {
            const obj = {};
            columns.forEach((col, index) => {
              obj[col] = row[index];
            });
            return obj;
          });
          resolve(results);
        } else if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) {
          reject(new Error(`Query ${state}: ${json?.status?.error?.message || 'Unknown error'}`));
        } else {
          setTimeout(() => pollDatabricksStatus(statementId, resolve, reject, attempts + 1), 2000);
        }
      } catch (e) {
        reject(e);
      }
    });
  }).on('error', reject).end();
}

// Função para buscar peças do técnico no Databricks
async function getTechnicianItems(technicianName) {
  const sql = `
    SELECT
      cod_peca_enviada AS item_code,
      descr_peca_enviada AS item_name,
      qtd_peca_enviada AS item_quantity,
      num_remessa AS item_num_remessa
    FROM ${DATABRICKS_TABLE}
    WHERE UPPER(TRIM(tecnico_nome)) = UPPER(TRIM(:technicianName))
      AND status_consumo = 'NOVO'
      AND (data_montagem_lote_dev IS NULL OR TRIM(CAST(data_montagem_lote_dev AS STRING)) = '')
      AND (data_envio_dev IS NULL OR TRIM(CAST(data_envio_dev AS STRING)) = '')
      AND (mont_lote IS NULL OR TRIM(CAST(mont_lote AS STRING)) = '')
    LIMIT 300
  `;

  return await runDatabricksQuery(sql, [
    { name: 'technicianName', value: technicianName }
  ]);
}

// Função para buscar o subgrupo prioritário da semana atual
async function getWeekSubgroup() {
  const { data } = await supabase
    .from('v_current_week_subgroup')
    .select('subgroup_name')
    .maybeSingle();
  return data?.subgroup_name || null;
}

// Função para selecionar peças baseada no subgrupo da semana
async function selectItemsBySubgroup(allItems, weekSubgroup) {
  if (!weekSubgroup) {
    // Se não houver subgrupo definido, seleciona TODAS as peças como fallback
    return allItems
      .map(item => ({ ...item, selection_reason: 'fallback_all_items' }));
  }

  // Filtra peças que pertencem ao subgrupo da semana
  const selected = allItems
    .filter(item => (item.item_subgroup || '').toLowerCase() === weekSubgroup.toLowerCase())
    .map(item => ({ ...item, selection_reason: `subgroup_${weekSubgroup}` }));

  // Se o subgrupo estiver vazio para este técnico, pega TODAS as peças dele
  if (selected.length === 0) {
    return allItems
      .map(item => ({ ...item, selection_reason: 'subgroup_empty_all_items' }));
  }

  return selected;
}

// Função principal
async function generateSchedules() {
  const week = weekRef || getWeekRef();
  console.log(`\n📅 Gerando agendamentos para semana: ${week}\n`);

  try {
    // 1. Busca técnicos ativos que POSSUEM agendamento configurado (dia e hora não nulos)
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, databricks_name, phone, active, inventory_day, inventory_time')
      .eq('active', true)
      .not('inventory_day', 'is', null)
      .not('inventory_time', 'is', null);

    if (techError) throw techError;

    if (!technicians || technicians.length === 0) {
      console.log('⚠️  Nenhum técnico ativo encontrado.');
      return;
    }

    console.log(`📋 Processando ${technicians.length} técnico(s)...\n`);

    const schedulesToCreate = [];
    const errors = [];

    // 2. Para cada técnico, seleciona 10 peças
    for (const tech of technicians) {
      const searchName = tech.databricks_name || tech.name;

      try {
        console.log(`  🔍 ${tech.name}...`);

        // Busca peças no Databricks
        const allItems = await getTechnicianItems(searchName);

        if (!allItems || allItems.length === 0) {
          console.log(`    ⚠️  Nenhuma peça encontrada no Databricks`);
          errors.push(`${tech.name}: sem peças no Databricks`);
          continue;
        }

        console.log(`    ✓ ${allItems.length} peça(s) encontrada(s) no Databricks`);

        // Busca o subgrupo da semana
        const weekSubgroup = await getWeekSubgroup();
        
        // Seleciona peças baseada no subgrupo
        const selected = await selectItemsBySubgroup(allItems, weekSubgroup);

        console.log(`    ✓ ${selected.length} peça(s) selecionada(s) (Subgrupo: ${weekSubgroup || 'N/A'})`);

        // Calcula horário de disparo baseado na configuração do técnico
        // Se não tiver dia definido, usa segunda-feira (1) como padrão
        const targetDay = tech.inventory_day || 1; // 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex
        const targetTime = tech.inventory_time || '09:00';
        const [hours, minutes] = targetTime.split(':').map(Number);

        // Trabalha com o horário de Brasília (GMT-3)
        const now = new Date();
        const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        
        const scheduledDate = new Date(brNow);
        let currentDay = brNow.getDay(); // 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sab
        
        // Ajusta o currentDay para o padrão 1=Seg...7=Dom se necessário, 
        // mas o JS usa 0=Dom. Vamos converter o targetDay para o padrão do JS:
        // Se targetDay for 1 (Seg), no JS é 1. Se for 7 (Dom), no JS é 0.
        const jsTargetDay = targetDay === 7 ? 0 : targetDay;

        let dayDiff = jsTargetDay - currentDay;
        
        // Se o dia já passou ou é hoje mas o horário já passou, pula para a próxima semana
        if (dayDiff < 0 || (dayDiff === 0 && (brNow.getHours() > hours || (brNow.getHours() === hours && brNow.getMinutes() >= minutes)))) {
          dayDiff += 7;
        }
        
        scheduledDate.setDate(brNow.getDate() + dayDiff);
        scheduledDate.setHours(hours, minutes, 0, 0);

        // Converte de volta para UTC para salvar no banco
        const utcScheduledDate = new Date(scheduledDate.getTime() + (3 * 60 * 60 * 1000));

        schedulesToCreate.push({
          technician_id: tech.id,
          scheduled_at: utcScheduledDate.toISOString(),
          week_ref: week,
          items_count: selected.length,
          notes: `Agendamento automático. Seleção: ${selected.map(s => s.selection_reason).join(', ')}`,
        });

        console.log(`    ✓ Agendamento preparado para ${scheduledDate.toLocaleString('pt-BR')} (Brasília) | UTC: ${utcScheduledDate.toISOString()}\n`);
      } catch (err) {
        console.error(`    ❌ Erro: ${err.message}`);
        errors.push(`${tech.name}: ${err.message}`);
      }
    }

    // 3. Salva os agendamentos no banco
    if (schedulesToCreate.length === 0) {
      console.log('❌ Nenhum agendamento foi preparado.');
      return;
    }

    if (dryRun) {
      console.log(`\n🔍 DRY RUN: ${schedulesToCreate.length} agendamento(s) seria(m) criado(s):\n`);
      schedulesToCreate.forEach((s, i) => {
        console.log(`  ${i + 1}. Técnico ID ${s.technician_id} - ${s.scheduled_at} (${s.items_count} peças)`);
      });
      console.log('\n💡 Execute sem --dry-run para confirmar a criação.\n');
      return;
    }

    console.log(`\n💾 Salvando ${schedulesToCreate.length} agendamento(s) no banco...\n`);

    const { data: created, error: insertError } = await supabase
      .from('inventory_schedules')
      .insert(schedulesToCreate)
      .select();

    if (insertError) throw insertError;

    console.log(`✅ ${created.length} agendamento(s) criado(s) com sucesso!\n`);

    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} erro(s) encontrado(s):`);
      errors.forEach(e => console.log(`   - ${e}`));
      console.log();
    }

    console.log(`📊 Resumo:`);
    console.log(`   - Semana: ${week}`);
    console.log(`   - Técnicos processados: ${technicians.length}`);
    console.log(`   - Agendamentos criados: ${created.length}`);
    console.log(`   - Erros: ${errors.length}\n`);

  } catch (err) {
    console.error(`\n❌ Erro fatal: ${err.message}\n`);
    process.exit(1);
  }
}

// Executar
generateSchedules().then(() => {
  console.log('✨ Concluído!\n');
  process.exit(0);
}).catch(err => {
  console.error(`\n❌ ${err.message}\n`);
  process.exit(1);
});
