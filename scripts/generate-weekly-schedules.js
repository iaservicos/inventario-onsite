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

// Função para selecionar 10 peças com prioridade
async function selectItemsWithPriority(allItems, technicianId, count = 10) {
  // Busca histórico de contagens (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: history } = await supabase
    .from('inventory_items')
    .select(`
      item_code,
      created_at,
      inventories!inner (
        technician_id,
        status,
        created_at
      )
    `)
    .eq('inventories.technician_id', technicianId)
    .in('inventories.status', ['completed', 'recount_pending'])
    .gte('inventories.created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false });

  // Monta mapa de última contagem
  const lastCountedMap = {};
  if (history && history.length > 0) {
    for (const row of history) {
      const code = row.item_code;
      if (!lastCountedMap[code]) {
        lastCountedMap[code] = row.created_at;
      }
    }
  }

  // Classifica peças por prioridade
  const neverCounted = [];
  const countedOld = [];
  const countedRecent = [];

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  for (const item of allItems) {
    const lastDate = lastCountedMap[item.item_code];

    if (!lastDate) {
      neverCounted.push(item);
    } else if (new Date(lastDate) < fourWeeksAgo) {
      countedOld.push({ ...item, last_counted: lastDate });
    } else {
      countedRecent.push({ ...item, last_counted: lastDate });
    }
  }

  // Ordena contadas antigas da mais antiga para a mais recente
  countedOld.sort((a, b) => new Date(a.last_counted) - new Date(b.last_counted));

  // Embaralha nunca contadas
  const shuffledNever = neverCounted.sort(() => Math.random() - 0.5);

  // Monta lista final com prioridade
  const selected = [];

  // 1ª: Nunca contadas
  for (const item of shuffledNever) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'never_counted' });
  }

  // 2ª: Contadas antigas
  for (const item of countedOld) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'oldest_count' });
  }

  // 3ª: Contadas recentemente
  const shuffledRecent = countedRecent.sort(() => Math.random() - 0.5);
  for (const item of shuffledRecent) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'recent_random' });
  }

  return selected.slice(0, count);
}

// Função principal
async function generateSchedules() {
  const week = weekRef || getWeekRef();
  console.log(`\n📅 Gerando agendamentos para semana: ${week}\n`);

  try {
    // 1. Busca todos os técnicos ativos
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, databricks_name, phone, active, inventory_day, inventory_time')
      .eq('active', true);

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

        // Seleciona 10 peças com prioridade
        const selected = await selectItemsWithPriority(allItems, tech.id, 10);

        console.log(`    ✓ ${selected.length} peça(s) selecionada(s) para contagem`);

        // Calcula horário de disparo baseado na configuração do técnico
        // Se não tiver dia definido, usa segunda-feira (1) como padrão
        const targetDay = tech.inventory_day || 1; 
        const targetTime = tech.inventory_time || '09:00';
        const [hours, minutes] = targetTime.split(':').map(Number);

        const scheduledDate = new Date();
        const currentDay = scheduledDate.getDay(); // 0=Dom, 1=Seg...
        
        // Calcula a diferença para o próximo dia alvo
        // Se hoje for o dia alvo e já passou do horário, agenda para a próxima semana
        let dayDiff = targetDay - currentDay;
        if (dayDiff < 0 || (dayDiff === 0 && (scheduledDate.getHours() > hours || (scheduledDate.getHours() === hours && scheduledDate.getMinutes() >= minutes)))) {
          dayDiff += 7;
        }
        
        scheduledDate.setDate(scheduledDate.getDate() + dayDiff);
        scheduledDate.setHours(hours, minutes, 0, 0);

        schedulesToCreate.push({
          technician_id: tech.id,
          scheduled_at: scheduledDate.toISOString(),
          week_ref: week,
          items_count: selected.length,
          notes: `Agendamento automático. Seleção: ${selected.map(s => s.selection_reason).join(', ')}`,
        });

        console.log(`    ✓ Agendamento preparado para ${scheduledDate.toLocaleString('pt-BR')} (Dia ${targetDay} às ${targetTime})\n`);
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
