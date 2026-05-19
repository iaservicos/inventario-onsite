/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse — VERSÃO DEFINITIVA
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

/**
 * Executa query com suporte real a paginação por chunks (INLINE)
 */
export async function runDatabricksQuery(sql, parameters = [], maxWaitMs = 300000) {
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
  let allData = [];

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`, {
      method: 'GET',
      headers: HEADERS(),
    });
    const statusData = await parseJsonSafe(statusRes);
    const state = statusData?.status?.state;

    if (state === 'SUCCEEDED') {
      // Pega o primeiro chunk que já vem no status
      allData = mapInlineResultToObjects(statusData);
      
      // Verifica se existem mais chunks
      const totalChunks = statusData?.result?.manifest?.total_chunk_count || 1;
      for (let i = 1; i < totalChunks; i++) {
        const chunkRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}/result_chunks/${i}`, {
          method: 'GET',
          headers: HEADERS(),
        });
        const chunkData = await parseJsonSafe(chunkRes);
        if (chunkRes.ok) {
          allData = allData.concat(mapInlineResultToObjects(chunkData));
        }
      }
      break;
    }
    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) throw new Error(`Query ${state}`);
    await sleep(3000);
  }

  return allData;
}

/**
 * BUSCA EM MASSA: Filtros originais + Filtro de RMDF (doc_faturamento)
 */
export async function getAllTechniciansItems(technicianNames) {
  if (!technicianNames || technicianNames.length === 0) return [];

  const batchSize = 25; 
  let allResults = [];

  for (let i = 0; i < technicianNames.length; i += batchSize) {
    const batchNames = technicianNames.slice(i, i + batchSize);
    const placeholders = batchNames.map((_, idx) => `:name${idx}`).join(', ');

    // FILTRO DEFINITIVO:
    // 1. Restauramos seus filtros originais de NULL/VAZIO.
    // 2. Adicionamos filtro de doc_faturamento para remover RMDFs (Felipe Durval).
    //    RMDFs têm um número no doc_faturamento, peças boas têm 'NÃO DEFINIDO'.
    const sql = `
      SELECT
        UPPER(TRIM(tecnico_nome)) AS technician_name_key,
        cod_peca_enviada AS item_code,
        descr_peca_enviada AS item_name,
        qtd_peca_enviada AS item_quantity,
        num_remessa AS item_num_remessa,
        chamado_aplicado,
        doc_faturamento
      FROM ${DATABRICKS_TABLE}
      WHERE UPPER(TRIM(tecnico_nome)) IN (${placeholders})
        AND status_consumo = 'NOVO'
        AND (data_montagem_lote_dev IS NULL OR TRIM(CAST(data_montagem_lote_dev AS STRING)) = '')
        AND (data_envio_dev IS NULL OR TRIM(CAST(data_envio_dev AS STRING)) = '')
        AND (mont_lote IS NULL OR TRIM(CAST(mont_lote AS STRING)) = '')
        -- Filtro para remover RMDF/Backup (Felipe Durval)
        AND (doc_faturamento IS NULL OR doc_faturamento = '' OR UPPER(TRIM(doc_faturamento)) = 'NÃO DEFINIDO')
    `;

    const parameters = batchNames.map((name, idx) => ({
      name: `name${idx}`,
      value: name.trim().toUpperCase()
    }));

    try {
      const result = await runDatabricksQuery(sql, parameters);
      allResults = allResults.concat(result);
    } catch (err) {
      console.error(`Erro no lote ${i}:`, err.message);
    }
  }

  return allResults;
}

export async function getTechnicianItems(technicianName) {
  return await getAllTechniciansItems([technicianName]);
}

export async function getTechnicianItemsSample(technicianName) {
  return await getTechnicianItems(technicianName);
}

export async function verifyTechnicianInDatabricks(technicianName) {
  const cleanName = (technicianName || '').trim();
  const sql = `SELECT tecnico_nome FROM ${DATABRICKS_TABLE} WHERE UPPER(TRIM(tecnico_nome)) = UPPER(TRIM(:technicianName)) LIMIT 1`;
  const result = await runDatabricksQuery(sql, [{ name: 'technicianName', value: cleanName }]);
  return {
    found: result.length > 0,
    databricks_name: result.length > 0 ? result[0].tecnico_nome : null,
    total_items: result.length > 0 ? 1 : 0
  };
}
