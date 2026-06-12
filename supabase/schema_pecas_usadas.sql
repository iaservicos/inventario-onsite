-- Pecas Usadas - criacao e migracao
-- View: vw_inventario_onsite_usado_rmdf
-- Execute no SQL Editor do Supabase

CREATE TABLE IF NOT EXISTS technician_used_items (
  id                BIGSERIAL PRIMARY KEY,
  technician_id     INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  item_code         TEXT NOT NULL,
  item_name         TEXT NOT NULL,
  item_subgroup     TEXT,
  item_quantity     INTEGER DEFAULT 0,
  item_num_remessa  TEXT,
  atp_centro        TEXT,
  atp_nome          TEXT,
  status_consumo    TEXT,
  chamado_consumo   TEXT,
  data_encerramento TIMESTAMPTZ,
  active            BOOLEAN DEFAULT true,
  synced_at         TIMESTAMPTZ DEFAULT NOW(),
  sync_batch_id     TEXT,
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  unit              TEXT DEFAULT 'un'
);

ALTER TABLE technician_used_items
  ADD COLUMN IF NOT EXISTS status_consumo    TEXT,
  ADD COLUMN IF NOT EXISTS chamado_consumo   TEXT,
  ADD COLUMN IF NOT EXISTS data_encerramento TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_tu_items_technician_id ON technician_used_items(technician_id);
CREATE INDEX IF NOT EXISTS idx_tu_items_item_code     ON technician_used_items(item_code);
CREATE INDEX IF NOT EXISTS idx_tu_items_sync_batch    ON technician_used_items(sync_batch_id);
CREATE INDEX IF NOT EXISTS idx_tu_items_status        ON technician_used_items(status_consumo);
