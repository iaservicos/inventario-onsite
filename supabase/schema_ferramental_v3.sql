-- ============================================================
-- FERRAMENTAL v3 — Desligamento e Devolução
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Evento de desligamento ───────────────────────────────────
CREATE TABLE IF NOT EXISTS ferramental_desligamentos (
  id              SERIAL PRIMARY KEY,
  technician_id   INTEGER REFERENCES technicians(id),
  technician_name TEXT NOT NULL,
  status          TEXT NOT NULL CHECK (status IN (
    'aguardando_validacao',
    'em_validacao',
    'concluido',
    'com_divergencia'
  )) DEFAULT 'aguardando_validacao',
  created_by      TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_by    TEXT,
  validated_at    TIMESTAMPTZ,
  notes           TEXT
);

-- ── Itens da devolução ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ferramental_devolucoes (
  id                 SERIAL PRIMARY KEY,
  desligamento_id    INTEGER NOT NULL REFERENCES ferramental_desligamentos(id) ON DELETE CASCADE,
  tool_id            INTEGER REFERENCES ferramental_tools(id),
  tool_name          TEXT NOT NULL,
  tool_notes         TEXT,
  expected_quantity  INTEGER NOT NULL DEFAULT 0,   -- o que o técnico tinha no estoque
  returned_quantity  INTEGER NOT NULL DEFAULT 0,   -- o que o gestor registrou como devolvido
  validated_quantity INTEGER,                      -- o que a analista confirmou
  destination_branch TEXT,                         -- filial de destino do estoque validado
  status             TEXT NOT NULL CHECK (status IN ('pendente', 'validado', 'divergencia')) DEFAULT 'pendente',
  divergence_notes   TEXT
);
