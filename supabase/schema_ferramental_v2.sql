-- ============================================================
-- FERRAMENTAL v2 — Alterações incrementais
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Campos de envio na solicitação ──────────────────────────
ALTER TABLE ferramental_requests
  ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('correio', 'pessoalmente')),
  ADD COLUMN IF NOT EXISTS tracking_code   TEXT;

-- ── Estoque Central (filiais) ────────────────────────────────
CREATE TABLE IF NOT EXISTS ferramental_central_stock (
  id               SERIAL PRIMARY KEY,
  tool_id          INTEGER NOT NULL REFERENCES ferramental_tools(id),
  branch_name      TEXT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 0,
  storage_location TEXT,
  notes            TEXT,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       TEXT,
  UNIQUE(tool_id, branch_name)
);
