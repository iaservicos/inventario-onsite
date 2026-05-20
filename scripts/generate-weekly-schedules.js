#!/usr/bin/env node

/**
 * scripts/generate-weekly-schedules.js
 * 
 * Script para gerar automaticamente agendamentos semanais de inventário.
 * Seleciona todas as peças do subgrupo da semana e consolida por código.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente
function loadEnv() {
  const envPaths = [path.join(process.cwd(), '.env.local'), path.join(process.cwd(), '.env')];
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

function getWeekRef(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

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
          pollDatabricksStatus(json.statement_id, resolve, reject);
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function pollDatabricksStatus(statementId, resolve, reject, attempts = 0) {
  if (attempts > 30) return reject(new Error('Databricks query timeout'));
  const options = {
    hostname: process.env.DATABRICKS_HOST.replace(/^https?:\/\//, ''),
    path: `/api/2.0/sql/statements/${statementId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${process.env.DATABRICKS_TOKEN}` },
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
          resolve(rows.map(row => {
            const obj = {};
            columns.forEach((col, index) => { obj[col] = row[index]; });
            return obj;
          }));
        } else if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) {
          reject(new Error(`Query ${state}: ${json?.status?.error?.message || 'Unknown error'}`));
        } else {
          setTimeout(() => pollDatabricksStatus(statementId, resolve, reject, attempts + 1), 2000);
        }
      } catch (e) { reject(e); }
    });
  }).on('error', reject).end();
}

async function getTechnicianItems(technicianName) {
  const sql = `
    SELECT cod_peca_enviada AS item_code, descr_peca_enviada AS item_name, qtd_peca_enviada AS item_quantity
    FROM ${DATABRICKS_TABLE}
    WHERE UPPER(TRIM(tecnico_nome)) = UPPER(TRIM(:technicianName))
      AND status_consumo = 'NOVO'
      AND (data_montagem_lote_dev IS NULL OR TRIM(CAST(data_montagem_lote_dev AS STRING)) = '')
      AND (data_envio_dev IS NULL OR TRIM(CAST(data_envio_dev AS STRING)) = '')
      AND (mont_lote IS NULL OR TRIM(CAST(mont_lote AS STRING)) = '')
  `;
  return await runDatabricksQuery(sql, [{ name: 'technicianName', value: technicianName }]);
}

async function getWeekSubgroup() {
  const { data } = await supabase.from('v_current_week_subgroup').select('subgroup_name').maybeSingle();
  return data?.subgroup_name || null;
}

async function generateSchedules() {
  const week = weekRef || getWeekRef();
  console.log(`\n📅 Gerando agendamentos para semana: ${week}\n`);

  try {
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, databricks_name, inventory_day, inventory_time')
      .eq('active', true)
      .not('inventory_day', 'is', null)
      .not('inventory_time', 'is', null);

    if (techError) throw techError;
    if (!technicians?.length) return console.log('⚠️ Nenhum técnico configurado encontrado.');

    console.log(`📋 Processando ${technicians.length} técnico(s)...\n`);
    const schedulesToCreate = [];

    for (const tech of technicians) {
      try {
        console.log(`  🔍 ${tech.name}...`);
        const allItems = await getTechnicianItems(tech.databricks_name || tech.name);
        if (!allItems?.length) {
          console.log(`    ⚠️ Nenhuma peça encontrada`);
          continue;
        }

        const weekSubgroup = await getWeekSubgroup();
        let selected = weekSubgroup 
          ? allItems.filter(item => (item.item_subgroup || '').toLowerCase() === weekSubgroup.toLowerCase())
          : [];
        
        let reason = `Subgrupo: ${weekSubgroup}`;
        if (selected.length === 0) {
          selected = allItems;
          reason = "Fallback: Todas as peças";
        }

        // Consolidação por código
        const consolidatedMap = new Map();
        selected.forEach(item => {
          const code = item.item_code;
          if (consolidatedMap.has(code)) {
            const existing = consolidatedMap.get(code);
            existing.item_quantity = (Number(existing.item_quantity) || 0) + (Number(item.item_quantity) || 1);
          } else {
            consolidatedMap.set(code, { ...item });
          }
        });
        const consolidatedItems = Array.from(consolidatedMap.values());

        // Cálculo de data (Brasília)
        const targetDay = tech.inventory_day || 1;
        const targetTime = tech.inventory_time || '09:00';
        const [hours, minutes] = targetTime.split(':').map(Number);
        const now = new Date();
        const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
        const scheduledDate = new Date(brNow);
        const jsTargetDay = targetDay === 7 ? 0 : targetDay;
        let dayDiff = jsTargetDay - brNow.getDay();
        if (dayDiff < 0 || (dayDiff === 0 && (brNow.getHours() > hours || (brNow.getHours() === hours && brNow.getMinutes() >= minutes)))) dayDiff += 7;
        scheduledDate.setDate(brNow.getDate() + dayDiff);
        scheduledDate.setHours(hours, minutes, 0, 0);
        const utcDate = new Date(scheduledDate.getTime() + (3 * 60 * 60 * 1000));

        schedulesToCreate.push({
          technician_id: tech.id,
          scheduled_at: utcDate.toISOString(),
          week_ref: week,
          items_count: consolidatedItems.length,
          notes: `Auto: ${reason} (${selected.length} peças totais, ${consolidatedItems.length} únicos)`
        });
        console.log(`    ✅ ${consolidatedItems.length} itens para ${scheduledDate.toLocaleString('pt-BR')}`);
      } catch (err) { console.error(`    ❌ Erro: ${err.message}`); }
    }

    if (!dryRun && schedulesToCreate.length > 0) {
      await supabase.from('inventory_schedules').upsert(schedulesToCreate, { onConflict: 'technician_id,week_ref' });
      console.log(`\n🚀 ${schedulesToCreate.length} agendamentos salvos!`);
    }
  } catch (err) { console.error(`\n❌ Erro fatal: ${err.message}`); }
}

generateSchedules();
