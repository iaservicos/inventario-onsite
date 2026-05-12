/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse
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
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapInlineResultToObjects(payload) {
  const columns = payload?.manifest?.schema?.columns?.map(col => col.name.toLowerCase()) || [];
  const rows = payload?.result?.data_array || [];

  return rows.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
}

export async function runDatabricksQuery(sql, parameters = [], maxWaitMs = 60000) {
  if (!DATABRICKS_HOST || !DATABRICKS_TOKEN || !DATABRICKS_WAREHOUSE_ID) {
    throw new Error('Databricks não configurado. Verifique as variáveis de ambiente.');
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

  if (!submitRes.ok) {
    throw new Error(
      `Erro Databricks ao enviar query: ${
        submitData?.message || submitData?.error_code || submitRes.statusText
      }`
    );
  }

  const statementId = submitData?.statement_id;

  if (!statementId) {
    throw new Error('Databricks não retornou statement_id.');
  }

  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(
      `${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`,
      {
        method: 'GET',
        headers: HEADERS(),
      }
    );

    const statusData = await parseJsonSafe(statusRes);

    if (!statusRes.ok) {
      throw new Error(
        `Erro Databricks ao consultar status: ${
          statusData?.message || statusData?.error_code || statusRes.statusText
        }`
      );
    }

    const state = statusData?.status?.state;

    if (state === 'SUCCEEDED') {
      return mapInlineResultToObjects(statusData);
    }

    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) {
      throw new Error(
        `Query Databricks ${state}: ${
          statusData?.status?.error?.message || 'Erro desconhecido'
        }`
      );
    }

    await sleep(2000);
  }

  throw new Error('Timeout aguardando resposta do Databricks');
}

/**
 * Busca o portfólio de peças do técnico
 */
export async function getTechnicianItems(technicianName) {
  const sql = `
    SELECT
      cod_peca_enviada AS item_code,
      descr_peca_enviada AS item_name,
      qtd_peca_enviada AS item_quantity
    FROM ${DATABRICKS_TABLE}
    WHERE tecnico_nome = :technicianName
      AND status_consumo = 'NOVO'
      AND (data_montagem_lote_dev IS NULL OR TRIM(CAST(data_montagem_lote_dev AS STRING)) = '')
      AND (data_envio_dev IS NULL OR TRIM(CAST(data_envio_dev AS STRING)) = '')
      AND (mont_lote IS NULL OR TRIM(CAST(mont_lote AS STRING)) = '')
    LIMIT 300
  `;

  return await runDatabricksQuery(sql, [
    {
      name: 'technicianName',
      value: technicianName,
    },
  ]);
}


// Mantido para evitar erro de build
export async function getTechnicianItemsSample(technicianName) {
  return await getTechnicianItems(technicianName);
}

// Mantido para evitar erro de build
export async function verifyTechnicianInDatabricks(technicianName) {
  const sql = `
    SELECT tecnico_nome
    FROM ${DATABRICKS_TABLE}
    WHERE tecnico_nome = :technicianName
    LIMIT 1
  `;

  const result = await runDatabricksQuery(sql, [
    {
      name: 'technicianName',
      value: technicianName,
    },
  ]);

  return result.length > 0;
}
