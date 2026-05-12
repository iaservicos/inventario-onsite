/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse com filtros específicos
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
 * Busca o portfólio de peças com filtros específicos de negócio
 */
export async function getTechnicianItems(technicianName) {
  // Query ajustada com seus filtros específicos:
  // - tecnico_nome: Nome do técnico
  // - status_consumo: NOVO
  // - tecnico_tipo: Externo
  // - Colunas em branco (IS NULL): data_montagem_lote_dev, data_envio_dev, mont_lote
  const sql = `
    SELECT 
      cod_item as item_code, 
      nome_item as item_name, 
      unidade as unit,
      SUM(\`Quantidade _peca_enviada\`) as quantity
    FROM ${DATABRICKS_TABLE}
    WHERE tecnico_nome = '${technicianName}' 
      AND status_consumo = 'NOVO'
      AND tecnico_tipo = 'Externo'
      AND data_montagem_lote_dev IS NULL
      AND data_envio_dev IS NULL
      AND mont_lote IS NULL
    GROUP BY cod_item, nome_item, unidade
    ORDER BY nome_item ASC
  `;

  return await runDatabricksQuery(sql);
}
