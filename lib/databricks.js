/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse — Versão Turbo
 */

const DATABRICKS_HOST = (process.env.DATABRICKS_HOST || '').replace(/\/$/, '');
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const DATABRICKS_WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
const DATABRICKS_TABLE =
  process.env.DATABRICKS_TABLE ||
  'datalake_prod.indicadores_servicos.consolidacao_fiscal';

const HEADERS = () => ({
  Authorization: `Bearer ${DATABRICKS_TOKEN}`,
  'Content-Type': 'application/json',
});

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseJsonSafe(response) {
  try { return await response.json(); } catch { return null; }
}

function mapInlineResultToObjects(payload) {
  const columns = payload?.manifest?.schema?.columns?.map(col => col.name.toLowerCase()) || [];
  const rows = payload?.result?.data_array || [];
  return rows.map(row => {
    const obj = {};
    columns.forEach((col, index) => { obj[col] = row[index]; });
    return obj;
  });
}

export async function runDatabricksQuery(sql, parameters = [], maxWaitMs = 120000) {
  if (!DATABRICKS_HOST || !DATABRICKS_TOKEN || !DATABRICKS_WAREHOUSE_ID) {
    throw new Error('Databricks não configurado.');
  }

  const submitRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      warehouse_id: DATABRICKS_WAREHOUSE_ID,
      statement: sql,
      parameters,
      disposition: 'INLINE',
      format: 'JSON_ARRAY',
      wait_timeout: '0s',
      on_wait_timeout: 'CONTINUE',
    }),
  });

  const submitData = await parseJsonSafe(submitRes);
  if (!submitRes.ok) throw new Error(`Erro Databricks: ${submitData?.message || submitRes.statusText}`);

  const statementId = submitData?.statement_id;
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`, {
      method: 'GET',
      headers: HEADERS(),
    });
    const statusData = await parseJsonSafe(statusRes);
    const state = statusData?.status?.state;
    if (state === 'SUCCEEDED') return mapInlineResultToObjects(statusData);
    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) throw new Error(`Query ${state}`);
    await sleep(2000);
  }
  throw new Error('Timeout Databricks');
}

/**
 * BUSCA EM MASSA (Turbo): Busca peças de TODOS os técnicos de uma vez
 */
export async function getAllTechniciansItems(technicianNames) {
  if (!technicianNames || technicianNames.length === 0) return [];

  // Quebra em lotes de 100 nomes para não estourar limite de parâmetros da query
  const batchSize = 100;
  let allResults = [];

  for (let i = 0; i < technicianNames.length; i += batchSize) {
    const batchNames = technicianNames.slice(i, i + batchSize);
    const placeholders = batchNames.map((_, idx) => `:name${idx}`).join(', ');

    const sql = `
      SELECT
        UPPER(TRIM(tecnico_nome)) AS technician_name_key,
        cod_peca_enviada AS item_code,
        descr_peca_enviada AS item_name,
        qtd_peca_enviada AS item_quantity,
        num_remessa AS item_num_remessa
      FROM ${DATABRICKS_TABLE}
      WHERE UPPER(TRIM(tecnico_nome)) IN (${placeholders})
        AND status_consumo = 'NOVO'
        AND (data_montagem_lote_dev IS NULL OR TRIM(CAST(data_montagem_lote_dev AS STRING)) = '')
        AND (data_envio_dev IS NULL OR TRIM(CAST(data_envio_dev AS STRING)) = '')
        AND (mont_lote IS NULL OR TRIM(CAST(mont_lote AS STRING)) = '')
      LIMIT 10000
    `;

    const parameters = batchNames.map((name, idx) => ({
      name: `name${idx}`,
      value: name.trim().toUpperCase()
    }));

    const result = await runDatabricksQuery(sql, parameters);
    allResults = allResults.concat(result);
  }

  return allResults;
}

// Mantido para compatibilidade individual
export async function getTechnicianItems(technicianName) {
  const results = await getAllTechniciansItems([technicianName]);
  return results;
}
