/**
 * scripts/sync-pecas-datalake.js
 *
 * Job de sincronização diária: Databricks → Supabase (tabela technician_items)
 *
 * Fluxo:
 *   1. Cria um registro de controle em datalake_sync_log (status: 'running')
 *   2. Busca todos os técnicos ativos no Supabase
 *   3. Para cada técnico, executa a query no Databricks com as regras de filtro
 *   4. Faz upsert das peças encontradas na tabela technician_items
 *   5. Desativa (soft-delete) peças que não vieram mais no Datalake para aquele técnico
 *   6. Atualiza o registro de controle com o resultado final
 *
 * Uso:
 *   node scripts/sync-pecas-datalake.js
 *   node scripts/sync-pecas-datalake.js --dry-run   (apenas loga, não grava)
 *   node scripts/sync-pecas-datalake.js --tech-id=42 (processa apenas 1 técnico)
 *
 * Variáveis de ambiente necessárias (em .env.local ou variáveis do sistema):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   DATABRICKS_HOST
 *   DATABRICKS_TOKEN
 *   DATABRICKS_WAREHOUSE_ID
 *   DATABRICKS_TABLE  (opcional, padrão: datalake_prod.indicadores_servicos.consolidacao_fiscal)
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Carrega variáveis de ambiente ─────────────────────────────────────────────
// Tenta .env.local primeiro, depois .env
const envFiles = ['.env.local', '.env'];
for (const f of envFiles) {
  const envPath = path.resolve(process.cwd(), f);
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
    console.log(`[env] Carregado: ${f}`);
    break;
  }
}

const { createClient } = require('@supabase/supabase-js');
const { randomUUID }   = require('crypto');

// ── Configurações ─────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATABRICKS_HOST   = (process.env.DATABRICKS_HOST || '').replace(/\/$/, '');
const DATABRICKS_TOKEN  = process.env.DATABRICKS_TOKEN;
const WAREHOUSE_ID      = process.env.DATABRICKS_WAREHOUSE_ID;
const DATABRICKS_TABLE  = process.env.DATABRICKS_TABLE ||
  'datalake_prod.indicadores_servicos.vw_inventario_onsite';

// ── Argumentos CLI ────────────────────────────────────────────────────────────
const args    = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const TECH_ID = (() => {
  const a = args.find(a => a.startsWith('--tech-id='));
  return a ? parseInt(a.split('=')[1], 10) : null;
})();

// ── Validação de configuração ─────────────────────────────────────────────────
function validateConfig() {
  const missing = [];
  if (!SUPABASE_URL)     missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!SUPABASE_KEY)     missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!DATABRICKS_HOST)  missing.push('DATABRICKS_HOST');
  if (!DATABRICKS_TOKEN) missing.push('DATABRICKS_TOKEN');
  if (!WAREHOUSE_ID)     missing.push('DATABRICKS_WAREHOUSE_ID');
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente ausentes:', missing.join(', '));
    process.exit(1);
  }
}

// ── Cliente Supabase ──────────────────────────────────────────────────────────
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ── Helpers Databricks (HTTP REST — sem dependência de SDK) ───────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseJsonSafe(response) {
  try { return await response.json(); }
  catch { return null; }
}

function mapInlineResult(payload) {
  const columns = (payload?.manifest?.schema?.columns || []).map(c => c.name.toLowerCase());
  const rows    = payload?.result?.data_array || [];
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

async function runDatabricksQuery(sql, parameters = [], maxWaitMs = 90000) {
  const headers = {
    Authorization: `Bearer ${DATABRICKS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  const submitRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      warehouse_id: WAREHOUSE_ID,
      statement: sql,
      parameters,
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
      wait_timeout: '0s',
      on_wait_timeout: 'CONTINUE',
    }),
  });

  const submitData = await parseJsonSafe(submitRes);
  if (!submitRes.ok) {
    throw new Error(`Databricks submit error: ${submitData?.message || submitRes.statusText}`);
  }

  const statementId = submitData?.statement_id;
  if (!statementId) throw new Error('Databricks não retornou statement_id');

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(
      `${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`,
      { method: 'GET', headers }
    );
    const statusData = await parseJsonSafe(statusRes);
    if (!statusRes.ok) {
      throw new Error(`Databricks status error: ${statusData?.message || statusRes.statusText}`);
    }

    const state = statusData?.status?.state;
    if (state === 'SUCCEEDED') return mapInlineResult(statusData);
    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) {
      throw new Error(`Query ${state}: ${statusData?.status?.error?.message || 'Erro desconhecido'}`);
    }

    await sleep(2500);
  }

  throw new Error('Timeout aguardando resposta do Databricks');
}

/**
 * Busca as peças de um técnico no Databricks aplicando as regras de filtro:
 *   - status_consumo = 'NOVO'
 *   - data_montagem_lote_dev IS NULL ou vazio
 *   - data_envio_dev IS NULL ou vazio
 *   - mont_lote IS NULL ou vazio
 */
async function fetchTechnicianItemsFromDatabricks(technicianName) {
  const cleanName = (technicianName || '').trim();
  const sql = `
    SELECT
      atp_centro,
      atp_nome,
      technician_name_key,
      cod_peca_enviada AS item_code,
      descr_peca_enviada AS item_name,
      qtd_peca_enviada AS item_quantity,
      num_remessa AS item_num_remessa
    FROM ${DATABRICKS_TABLE}
    WHERE technician_name_key = UPPER(TRIM(:technicianName))
    LIMIT 1000
  `;
  return await runDatabricksQuery(sql, [
    { name: 'technicianName', value: cleanName },
  ]);
}

// ── Lógica principal de sincronização ────────────────────────────────────────

async function syncTechnician(supabase, tech, batchId, syncedAt) {
  const searchName = tech.databricks_name || tech.name;

  console.log(`  → [${tech.id}] ${tech.name} (busca: "${searchName}")`);

  // 1. Busca peças no Databricks
  let databricksItems;
  try {
    databricksItems = await fetchTechnicianItemsFromDatabricks(searchName);
  } catch (err) {
    console.error(`    ✗ Erro Databricks: ${err.message}`);
    throw err;
  }

  console.log(`    ✓ ${databricksItems.length} peça(s) encontrada(s) no Datalake`);

  if (DRY_RUN) {
    console.log('    [dry-run] Nenhuma gravação realizada');
    return { upserted: databricksItems.length, deactivated: 0 };
  }

  // 2. Upsert das peças encontradas
  let upsertedCount = 0;
  if (databricksItems.length > 0) {
    const rows = databricksItems.map(item => ({
      technician_id:    tech.id,
      item_code:        String(item.item_code || '').trim(),
      item_name:        String(item.item_name || '').trim(),
      item_quantity:    item.item_quantity != null ? parseFloat(item.item_quantity) : 0,
      item_num_remessa: item.item_num_remessa != null ? String(item.item_num_remessa).trim() : null,
      atp_centro:       item.atp_centro != null ? String(item.atp_centro).trim() : null,
      atp_nome:         item.atp_nome != null ? String(item.atp_nome).trim() : null,
      unit:             'un',
      active:           true,
      synced_at:        syncedAt,
      sync_batch_id:    batchId,
      updated_at:       syncedAt,
    }));

    // Upsert em lotes de 100 para evitar payload muito grande
    const BATCH_SIZE = 100;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('technician_items')
        .upsert(chunk, { onConflict: 'technician_id,item_code' });

      if (error) throw new Error(`Supabase upsert error: ${error.message}`);
      upsertedCount += chunk.length;
    }
    console.log(`    ✓ ${upsertedCount} peça(s) gravada(s) no Supabase`);
  }

  // 3. Desativa peças que não vieram mais no Datalake (soft-delete)
  // Busca os item_codes que vieram do Databricks
  const activeCodes = databricksItems.map(i => String(i.item_code || '').trim()).filter(Boolean);

  // Busca peças ativas no Supabase para este técnico
  const { data: existingItems, error: fetchErr } = await supabase
    .from('technician_items')
    .select('id, item_code')
    .eq('technician_id', tech.id)
    .eq('active', true);

  if (fetchErr) throw new Error(`Supabase fetch error: ${fetchErr.message}`);

  // Identifica peças que estavam ativas mas não vieram mais
  const toDeactivate = (existingItems || [])
    .filter(row => !activeCodes.includes(row.item_code))
    .map(row => row.id);

  let deactivatedCount = 0;
  if (toDeactivate.length > 0) {
    const { error: deactErr } = await supabase
      .from('technician_items')
      .update({ active: false, updated_at: syncedAt })
      .in('id', toDeactivate);

    if (deactErr) throw new Error(`Supabase deactivate error: ${deactErr.message}`);
    deactivatedCount = toDeactivate.length;
    console.log(`    ✓ ${deactivatedCount} peça(s) desativada(s) (não vieram mais no Datalake)`);
  }

  return { upserted: upsertedCount, deactivated: deactivatedCount };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Sync Peças Datalake → Supabase');
  console.log(`  Início: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  if (DRY_RUN) console.log('  ⚠️  MODO DRY-RUN: nenhuma gravação será feita');
  if (TECH_ID) console.log(`  ⚠️  Processando apenas técnico ID: ${TECH_ID}`);
  console.log('═══════════════════════════════════════════════════════════');

  validateConfig();

  const supabase  = getSupabase();
  const batchId   = randomUUID();
  const syncedAt  = new Date().toISOString();
  let logId       = null;

  // ── Cria registro de controle ───────────────────────────────────────────────
  if (!DRY_RUN) {
    const { data: logRow, error: logErr } = await supabase
      .from('datalake_sync_log')
      .insert({
        batch_id:     batchId,
        status:       'running',
        started_at:   syncedAt,
        triggered_by: TECH_ID ? 'manual' : 'cron',
      })
      .select('id')
      .single();

    if (logErr) {
      console.error('❌ Erro ao criar registro de log:', logErr.message);
      process.exit(1);
    }
    logId = logRow.id;
    console.log(`\n[log] Registro de controle criado: ID ${logId}, batch: ${batchId}`);
  }

  // ── Busca técnicos no Supabase ──────────────────────────────────────────────
  let techQuery = supabase
    .from('technicians')
    .select('id, name, databricks_name')
    .eq('active', true);

  if (TECH_ID) techQuery = techQuery.eq('id', TECH_ID);

  const { data: technicians, error: techErr } = await techQuery;
  if (techErr) {
    console.error('❌ Erro ao buscar técnicos:', techErr.message);
    process.exit(1);
  }

  console.log(`\n[info] ${technicians.length} técnico(s) ativo(s) para processar\n`);

  // ── Processa cada técnico ───────────────────────────────────────────────────
  let techOk      = 0;
  let techFailed  = 0;
  let totalUpsert = 0;
  let totalDeact  = 0;

  for (const tech of technicians) {
    try {
      const result = await syncTechnician(supabase, tech, batchId, syncedAt);
      techOk++;
      totalUpsert += result.upserted;
      totalDeact  += result.deactivated;
    } catch (err) {
      techFailed++;
      console.error(`  ✗ Falha no técnico ${tech.name}: ${err.message}`);
    }

    // Pequena pausa entre técnicos para não sobrecarregar o Databricks
    await sleep(500);
  }

  // ── Atualiza registro de controle ──────────────────────────────────────────
  const finishedAt = new Date().toISOString();
  const finalStatus = techFailed === 0 ? 'success'
    : techOk === 0 ? 'failed'
    : 'partial';

  if (!DRY_RUN && logId) {
    const { error: updateErr } = await supabase
      .from('datalake_sync_log')
      .update({
        finished_at:          finishedAt,
        status:               finalStatus,
        technicians_total:    technicians.length,
        technicians_ok:       techOk,
        technicians_failed:   techFailed,
        items_upserted:       totalUpsert,
        items_deactivated:    totalDeact,
      })
      .eq('id', logId);

    if (updateErr) {
      console.error('⚠️  Erro ao atualizar registro de log:', updateErr.message);
    }
  }

  // ── Resumo final ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  RESUMO DA SINCRONIZAÇÃO');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Status final:       ${finalStatus.toUpperCase()}`);
  console.log(`  Técnicos OK:        ${techOk} / ${technicians.length}`);
  console.log(`  Técnicos com falha: ${techFailed}`);
  console.log(`  Peças gravadas:     ${totalUpsert}`);
  console.log(`  Peças desativadas:  ${totalDeact}`);
  console.log(`  Batch ID:           ${batchId}`);
  console.log(`  Fim: ${new Date(finishedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  process.exit(finalStatus === 'failed' ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Erro fatal:', err.message);
  process.exit(1);
});
