-- Espelho da view Databricks datalake_prod.indicadores_servicos.vw_dev_tecnico_pendente
-- Representa pecas em lotes de devolucao para ATP que ainda nao foram recebidas.
-- Carga full a cada sync: apaga e recria, pois a view ja filtra apenas pendentes.

CREATE TABLE IF NOT EXISTS technician_pending_returns (
  id                        BIGSERIAL PRIMARY KEY,
  technician_id             INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  lote_dev_tecnico_id       TEXT,
  peca_fisica_id            TEXT,
  cod_peca                  TEXT,
  descr_peca                TEXT,
  status_devolucao          TEXT,
  status_consumo            TEXT,
  data_montagem_lote        TIMESTAMPTZ,
  data_envio_lote           TIMESTAMPTZ,
  data_recebimento_atp      TIMESTAMPTZ,
  data_recusado_atp         TIMESTAMPTZ,
  data_recebimento_tecnico  TIMESTAMPTZ,
  dias_aguardando           INTEGER,
  dt_materializacao         TIMESTAMPTZ,
  synced_at                 TIMESTAMPTZ DEFAULT NOW(),
  sync_batch_id             TEXT,
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pending_returns_technician ON technician_pending_returns(technician_id);
CREATE INDEX IF NOT EXISTS idx_pending_returns_status     ON technician_pending_returns(status_devolucao);

-- Se a tabela ja existia sem estas colunas, adiciona:
ALTER TABLE technician_pending_returns
  ADD COLUMN IF NOT EXISTS cod_peca   TEXT,
  ADD COLUMN IF NOT EXISTS descr_peca TEXT;
