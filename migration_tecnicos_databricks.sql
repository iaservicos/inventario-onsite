-- ============================================================
-- MIGRAÇÃO: Adicionar campos Databricks na tabela technicians
-- Execute no Supabase SQL Editor ANTES de rodar insert_tecnicos.sql
-- ============================================================

ALTER TABLE technicians
  ADD COLUMN IF NOT EXISTS supervisor_name      TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_email     TEXT,
  ADD COLUMN IF NOT EXISTS databricks_name      TEXT,
  ADD COLUMN IF NOT EXISTS databricks_id        INTEGER,
  ADD COLUMN IF NOT EXISTS databricks_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS databricks_total_items INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at           TIMESTAMPTZ DEFAULT NOW();

-- Índice para busca por nome no Databricks
CREATE INDEX IF NOT EXISTS idx_technicians_databricks_name ON technicians(UPPER(databricks_name));
CREATE INDEX IF NOT EXISTS idx_technicians_supervisor ON technicians(supervisor_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_technicians_name_unique ON technicians(UPPER(name));
