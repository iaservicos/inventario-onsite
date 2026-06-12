-- ============================================================
-- FERRAMENTAL — Schema Supabase
-- Execute no SQL Editor do Supabase
-- ============================================================

-- ── Catálogo de ferramentas padrão ───────────────────────────
CREATE TABLE IF NOT EXISTS ferramental_tools (
  id               SERIAL PRIMARY KEY,
  name             TEXT NOT NULL,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  notes            TEXT,
  active           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Estoque de ferramentas por técnico ───────────────────────
CREATE TABLE IF NOT EXISTS ferramental_technician_inventory (
  id            SERIAL PRIMARY KEY,
  technician_id INTEGER NOT NULL REFERENCES technicians(id),
  tool_id       INTEGER NOT NULL REFERENCES ferramental_tools(id),
  quantity      INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    TEXT,
  UNIQUE(technician_id, tool_id)
);

-- ── Solicitações de ferramentas ──────────────────────────────
CREATE TABLE IF NOT EXISTS ferramental_requests (
  id               SERIAL PRIMARY KEY,
  requester_type   TEXT NOT NULL CHECK (requester_type IN ('technician', 'gestor')) DEFAULT 'technician',
  technician_name  TEXT NOT NULL,
  technician_email TEXT,
  technician_id    INTEGER REFERENCES technicians(id),
  tool_id          INTEGER REFERENCES ferramental_tools(id),
  tool_name        TEXT NOT NULL,
  quantity         INTEGER NOT NULL DEFAULT 1,
  comment          TEXT,
  status           TEXT NOT NULL CHECK (status IN (
    'aguardando_aprovacao',
    'aprovado',
    'reprovado',
    'aguardando_envio',
    'enviando',
    'pendente',
    'aguardando_compra',
    'cancelado',
    'entregue'
  )) DEFAULT 'aguardando_aprovacao',
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  approval_notes   TEXT,
  analyst_notes    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Histórico de status das solicitações ─────────────────────
CREATE TABLE IF NOT EXISTS ferramental_request_history (
  id         SERIAL PRIMARY KEY,
  request_id INTEGER NOT NULL REFERENCES ferramental_requests(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  notes      TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Adiciona role analista_custo ─────────────────────────────
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'supervisor', 'coordinator', 'analyst', 'analista_custo'));

-- ── Seed: ferramentas padrão ─────────────────────────────────
INSERT INTO ferramental_tools (name, default_quantity, notes) VALUES
  ('MANTA ANTIESTÁTICA DE CAMPO + CABO', 1, NULL),
  ('PULSEIRA + CABO ESD',                1, NULL),
  ('ALICATE DE BICO',                    1, NULL),
  ('CHAVES PHILIPS 3/16*4',              1, NULL),
  ('PINÇA ESD RETA',                     1, NULL),
  ('PAR DE LUVAS ESD',                   1, NULL),
  ('PEN DRIVES 32GB',                    5, NULL),
  ('ESTILETE',                           1, NULL),
  ('JOGO VONDER',                        1, NULL),
  ('LUPA DE BOLSO',                      1, NULL),
  ('PINCEL DE LIMPEZA',                  1, NULL),
  ('MOCHILA',                            1, 'ATENÇÃO: ESTA MOCHILA FAZ PARTE DO KIT FERRAMENTAS. EM CASO DE DESLIGAMENTO DEVE SER DEVOLVIDA')
ON CONFLICT DO NOTHING;
