/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse — VERSÃO BLINDADA (Exclusão por Histórico)
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
  let finalData = [];
  let nextToken = null;

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`, {
      method: 'GET',
      headers: HEADERS(),
    });
    const statusData = await parseJsonSafe(statusRes);
    const state = statusData?.status?.state;

    if (state === 'SUCCEEDED') {
      finalData = mapInlineResultToObjects(statusData);
      nextToken = statusData?.result?.next_page_token;
      break;
    }
    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) throw new Error(`Query ${state}`);
    await sleep(3000);
  }

  while (nextToken) {
    const pageRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}/result_chunks/${nextToken}`, {
      method: 'GET',
      headers: HEADERS(),
    });
    const pageData = await parseJsonSafe(pageRes);
    if (!pageRes.ok) break;
    const pageItems = mapInlineResultToObjects(pageData);
    finalData = finalData.concat(pageItems);
    nextToken = pageData?.result?.next_page_token;
  }

  return finalData;
}

export async function getAllTechniciansItems(technicianNames) {
  if (!technicianNames || technicianNames.length === 0) return [];

  const batchSize = 30; 
  let allResults = [];

  for (let i = 0; i < technicianNames.length; i += batchSize) {
    const batchNames = technicianNames.slice(i, i + batchSize);
    const placeholders = batchNames.map((_, idx) => `:name${idx}`).join(', ');

    // LÓGICA DE EXCLUSÃO POR HISTÓRICO:
    // 1. Identifica quais peças (cod_peca_enviada) para quais técnicos já tiveram 
    //    qualquer sinal de montagem de lote ou devolução no passado.
    // 2. Filtra essas peças da consulta final.
    const sql = `
      WITH HistoricoSujo AS (
        SELECT DISTINCT tecnico_nome, cod_peca_enviada
        FROM ${DATABRICKS_TABLE}
        WHERE UPPER(TRIM(tecnico_nome)) IN (${placeholders})
          AND (
            (data_montagem_lote_dev IS NOT NULL AND TRIM(CAST(data_montagem_lote_dev AS STRING)) <> '') OR
            (data_envio_dev IS NOT NULL AND TRIM(CAST(data_envio_dev AS STRING)) <> '') OR
            (mont_lote IS NOT NULL AND TRIM(CAST(mont_lote AS STRING)) <> '')
          )
      )
      SELECT
        UPPER(TRIM(t.tecnico_nome)) AS technician_name_key,
        t.cod_peca_enviada AS item_code,
        t.descr_peca_enviada AS item_name,
        t.qtd_peca_enviada AS item_quantity,
        t.num_remessa AS item_num_remessa
      FROM ${DATABRICKS_TABLE} t
      LEFT JOIN HistoricoSujo h 
        ON UPPER(TRIM(t.tecnico_nome)) = UPPER(TRIM(h.tecnico_nome)) 
        AND t.cod_peca_enviada = h.cod_peca_enviada
      WHERE UPPER(TRIM(t.tecnico_nome)) IN (${placeholders})
        AND t.status_consumo = 'NOVO'
        AND h.cod_peca_enviada IS NULL -- EXCLUI se a peça já foi "suja" em qualquer remessa
        AND (t.data_montagem_lote_dev IS NULL OR TRIM(CAST(t.data_montagem_lote_dev AS STRING)) = '')
        AND (t.data_envio_dev IS NULL OR TRIM(CAST(t.data_envio_dev AS STRING)) = '')
        AND (t.mont_lote IS NULL OR TRIM(CAST(t.mont_lote AS STRING)) = '')
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
