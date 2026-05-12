/**
 * lib/databricks.js
 * Cliente de integração com Databricks SQL Warehouse
 * Usado para buscar o portfólio de peças de cada técnico em tempo real
 */

const DATABRICKS_HOST = process.env.DATABRICKS_HOST;
const DATABRICKS_TOKEN = process.env.DATABRICKS_TOKEN;
const DATABRICKS_WAREHOUSE_ID = process.env.DATABRICKS_WAREHOUSE_ID;
const DATABRICKS_TABLE = process.env.DATABRICKS_TABLE || 'datalake_prod.indicadores_servicos.consolidacao_fiscal';

const HEADERS = () => ({
  'Authorization': `Bearer ${DATABRICKS_TOKEN}`,
  'Content-Type': 'application/json',
});

/**
 * Executa uma query SQL no Databricks com polling automático
 * @param {string} sql - Query SQL a executar
 * @param {number} maxWaitMs - Tempo máximo de espera em ms (default: 60s)
 * @returns {Promise<Array>} - Array de arrays com os resultados
 */
export async function runDatabricksQuery(sql, maxWaitMs = 60000) {
  if (!DATABRICKS_HOST || !DATABRICKS_TOKEN || !DATABRICKS_WAREHOUSE_ID) {
    throw new Error('Databricks não configurado. Verifique DATABRICKS_HOST, DATABRICKS_TOKEN e DATABRICKS_WAREHOUSE_ID.');
  }

  // Submete a query de forma assíncrona
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

  const submitData = await submitRes.json();
  const statementId = submitData.statement_id;

  if (!statementId) {
    throw new Error(`Falha ao submeter query ao Databricks: ${JSON.stringify(submitData)}`);
  }

  // Polling até concluir
  const startTime = Date.now();
  let state = submitData.status?.state || 'PENDING';
  let resultData = submitData;

  while (['PENDING', 'RUNNING'].includes(state)) {
    if (Date.now() - startTime > maxWaitMs) {
      throw new Error(`Timeout aguardando Databricks (${maxWaitMs / 1000}s). Statement ID: ${statementId}`);
    }

    await new Promise((r) => setTimeout(r, 2000));

    const pollRes = await fetch(
      `${DATABRICKS_HOST}/api/2.0/sql/statements/${statementId}`,
      { headers: HEADERS() }
    );
    resultData = await pollRes.json();
    state = resultData.status?.state || 'UNKNOWN';
  }

  if (state !== 'SUCCEEDED') {
    const err = resultData.status?.error || {};
    throw new Error(`Query Databricks falhou (${state}): ${err.message || JSON.stringify(err)}`);
  }

  return resultData.result?.data_array || [];
}

/**
 * Busca o portfólio de peças de um técnico pelo nome completo
 * Retorna apenas peças com status_consumo = 'NOVO' e sem chamado de consumo
 * @param {string} technicianName - Nome completo do técnico (exato como está no Databricks)
 * @returns {Promise<Array<{item_code, item_name, expected_qty, unit}>>}
 */
export async function getTechnicianItems(technicianName) {
  const safeName = technicianName.replace(/'/g, "''"); // escape SQL injection

  const sql = `
    SELECT
      cod_peca_enviada   AS item_code,
      descr_peca_enviada AS item_name,
      SUM(qtd_peca_enviada) AS expected_qty
    FROM ${DATABRICKS_TABLE}
    WHERE UPPER(tecnico_nome) = UPPER('${safeName}')
      AND status_consumo = 'NOVO'
      AND (chamado_consumo IS NULL OR chamado_consumo = '')
      AND cod_peca_enviada IS NOT NULL
      AND descr_peca_enviada IS NOT NULL
    GROUP BY cod_peca_enviada, descr_peca_enviada
    ORDER BY expected_qty DESC, cod_peca_enviada
  `;

  const rows = await runDatabricksQuery(sql);

  return rows.map(([item_code, item_name, expected_qty]) => ({
    item_code: item_code || '',
    item_name: item_name || '',
    expected_qty: parseInt(expected_qty) || 0,
    unit: 'UN',
  }));
}

/**
 * Busca uma amostra aleatória de N peças do portfólio do técnico
 * Prioriza peças com maior quantidade em estoque
 * @param {string} technicianName - Nome completo do técnico
 * @param {number} count - Quantidade de peças a selecionar (default: 10)
 * @returns {Promise<Array>}
 */
export async function getTechnicianItemsSample(technicianName, count = 10) {
  const safeName = technicianName.replace(/'/g, "''");

  const sql = `
    WITH portfolio AS (
      SELECT
        cod_peca_enviada   AS item_code,
        descr_peca_enviada AS item_name,
        SUM(qtd_peca_enviada) AS expected_qty
      FROM ${DATABRICKS_TABLE}
      WHERE UPPER(tecnico_nome) = UPPER('${safeName}')
        AND status_consumo = 'NOVO'
        AND (chamado_consumo IS NULL OR chamado_consumo = '')
        AND cod_peca_enviada IS NOT NULL
        AND descr_peca_enviada IS NOT NULL
      GROUP BY cod_peca_enviada, descr_peca_enviada
    )
    SELECT item_code, item_name, expected_qty
    FROM portfolio
    ORDER BY RAND()
    LIMIT ${parseInt(count)}
  `;

  const rows = await runDatabricksQuery(sql);

  return rows.map(([item_code, item_name, expected_qty]) => ({
    item_code: item_code || '',
    item_name: item_name || '',
    expected_qty: parseInt(expected_qty) || 0,
    unit: 'UN',
  }));
}

/**
 * Verifica se um técnico existe no Databricks pelo nome
 * @param {string} technicianName
 * @returns {Promise<{found: boolean, total_items: number, databricks_name: string|null}>}
 */
export async function verifyTechnicianInDatabricks(technicianName) {
  const safeName = technicianName.replace(/'/g, "''");

  const sql = `
    SELECT
      tecnico_nome,
      COUNT(DISTINCT cod_peca_enviada) AS total_items
    FROM ${DATABRICKS_TABLE}
    WHERE UPPER(tecnico_nome) = UPPER('${safeName}')
      AND status_consumo = 'NOVO'
      AND (chamado_consumo IS NULL OR chamado_consumo = '')
      AND cod_peca_enviada IS NOT NULL
    GROUP BY tecnico_nome
    LIMIT 1
  `;

  const rows = await runDatabricksQuery(sql);

  if (!rows || rows.length === 0) {
    return { found: false, total_items: 0, databricks_name: null };
  }

  return {
    found: true,
    total_items: parseInt(rows[0][1]) || 0,
    databricks_name: rows[0][0],
  };
}
