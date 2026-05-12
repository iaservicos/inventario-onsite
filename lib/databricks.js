/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse
 */

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const DATABRICKS_WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
const DATABRICKS_TABLE = process.env.DATABRICKS_TABLE || 'datalake_prod.indicadores_servicos.consolidacao_fiscal';

const HEADERS = () => ({
  'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
  'Content-Type': 'application/json',
});

export async function runDatabricksQuery(sql, maxWaitMs = 60000) {
  if (!DATABRICKS_HOST || !DATABRICKS_TOKEN || !DATABRICKS_WAREHOUSE_ID) {
    throw new Error('Databricks não configurado. Verifique as variáveis de ambiente.');
  }

  const submitRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements`, {
    method: 'POST',
    headers: HEADERS(),
    body: JSON.stringify({
      warehouse_id: DATABRICKS_WAREHOUSE_ID,
      statement: sql,
      wait_timeout: '0s',
      on_wait_timeout: 'CONTINUE',
    }),
  });

  if (!submitRes.ok) {
    const error = await submitRes.json();
    throw new Error(`Erro Databricks: ${error.message || submitRes.statusText}`);
  }

  const { statement_id } = await submitRes.json();
  const start = Date.now();
  
  while (Date.now() - start < maxWaitMs) {
    const statusRes = await fetch(`${DATABRICKS_HOST}/api/2.0/sql/statements/${statement_id}`, {
      headers: HEADERS(),
    });
    
    const statusData = await statusRes.json();
    const state = statusData.status.state;

    if (state === 'SUCCEEDED') {
      const columns = statusData.manifest.schema.columns.map(c => c.name.toLowerCase());
      return statusData.result.data_array.map(row => {
        const obj = {};
        columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj;
      });
    }

    if (['FAILED', 'CANCELED', 'CLOSED'].includes(state)) {
      throw new Error(`Query Databricks ${state}: ${statusData.status.error?.message || 'Erro desconhecido'}`);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Timeout aguardando resposta do Databricks');
}

/**
 * Busca o portfólio de peças com os filtros específicos
 */
export async function getTechnicianItems(technicianName) {
  // Query ultra-simples para teste de conexão
  const sql = `
    SELECT
      cod_peca_enviada as item_code, 
      descr_peca_enviada as item_name, 
      unidade as unit,
      SUM(qtd_peca_enviada) as quantity
    FROM ${DATABRICKS_TABLE}
    WHERE tecnico_nome = '${technicianName}'
    LIMIT 300
  `;

  console.log("Executando query de teste:", sql);
  return await runDatabricksQuery(sql);
}


// ADICIONADO PARA EVITAR ERRO DE BUILD
export async function getTechnicianItemsSample(technicianName) {
  return await getTechnicianItems(technicianName);
}

// ADICIONADO PARA EVITAR ERRO DE BUILD
export async function verifyTechnicianInDatabricks(technicianName) {
  const sql = `SELECT tecnico_nome FROM ${DATABRICKS_TABLE} WHERE tecnico_nome = '${technicianName}' LIMIT 1`;
  const result = await runDatabricksQuery(sql);
  return result.length > 0;
}
