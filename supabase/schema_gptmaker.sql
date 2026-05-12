-- ============================================================
-- INVENTÁRIO ONSITE — Extensão de Schema para GPT Maker
-- Execute este arquivo no SQL Editor do Supabase
-- APÓS o schema.sql principal já estar aplicado
-- ============================================================

-- ── Peças por técnico ────────────────────────────────────────
-- Catálogo de peças que cada técnico é responsável por contar
CREATE TABLE IF NOT EXISTS technician_items (
  id           SERIAL PRIMARY KEY,
  technician_id INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  item_code    TEXT NOT NULL,
  item_name    TEXT NOT NULL,
  unit         TEXT DEFAULT 'un',
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (technician_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_technician_items_tech ON technician_items(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_items_active ON technician_items(technician_id, active);

-- ── Agendamentos de inventário ───────────────────────────────
-- Supervisor programa quando cada técnico deve fazer o inventário
CREATE TABLE IF NOT EXISTS inventory_schedules (
  id              SERIAL PRIMARY KEY,
  technician_id   INTEGER NOT NULL REFERENCES technicians(id) ON DELETE CASCADE,
  scheduled_by    UUID REFERENCES users(id),
  scheduled_at    TIMESTAMPTZ NOT NULL,          -- data/hora exata do disparo
  week_ref        TEXT NOT NULL,                 -- ex: "2025-W22"
  items_count     INTEGER NOT NULL DEFAULT 10,   -- quantas peças enviar
  status          TEXT NOT NULL CHECK (status IN ('pending','dispatched','completed','cancelled','abandoned')) DEFAULT 'pending',
  inventory_id    INTEGER REFERENCES inventories(id),  -- preenchido após disparo
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_technician ON inventory_schedules(technician_id);
CREATE INDEX IF NOT EXISTS idx_schedules_status ON inventory_schedules(status);
CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON inventory_schedules(scheduled_at);

-- ── Sessões de conversa GPT Maker ───────────────────────────
-- Rastreia cada conversa ativa com um técnico no WhatsApp
CREATE TABLE IF NOT EXISTS gptmaker_sessions (
  id              SERIAL PRIMARY KEY,
  inventory_id    INTEGER NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  technician_id   INTEGER NOT NULL REFERENCES technicians(id),
  phone           TEXT NOT NULL,                 -- número WhatsApp do técnico
  current_item_index INTEGER NOT NULL DEFAULT 0, -- qual peça está sendo contada agora
  status          TEXT NOT NULL CHECK (status IN ('active','waiting_answer','completed','abandoned','recount')) DEFAULT 'active',
  session_token   TEXT NOT NULL UNIQUE,          -- token para validar webhook do GPT Maker
  last_message_at TIMESTAMPTZ,
  abandon_notified BOOLEAN DEFAULT false,
  technician_name TEXT,                          -- cache do nome para notificações
  technician_phone TEXT,                         -- alias de phone para compatibilidade
  schedule_id     INTEGER REFERENCES inventory_schedules(id),
  renotified_at   TIMESTAMPTZ,                   -- quando foi renotificado
  renotify_count  INTEGER NOT NULL DEFAULT 0,    -- quantas vezes renotificou
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_inventory ON gptmaker_sessions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_sessions_phone ON gptmaker_sessions(phone);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON gptmaker_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON gptmaker_sessions(session_token);

-- ── Adicionar campo phone na tabela technicians (se não existir) ──
-- O campo phone já existe no schema original, mas garantimos que está presente
-- ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── Adicionar campo recount_of na tabela inventories ─────────────
-- Referencia o inventário original quando é uma recontagem
ALTER TABLE inventories ADD COLUMN IF NOT EXISTS recount_of INTEGER REFERENCES inventories(id);
CREATE INDEX IF NOT EXISTS idx_inventories_recount_of ON inventories(recount_of);

-- ── Atualizar flow_logs para aceitar fonte gptmaker ──────────
-- Precisamos adicionar 'gptmaker' como fonte válida
ALTER TABLE flow_logs DROP CONSTRAINT IF EXISTS flow_logs_source_check;
ALTER TABLE flow_logs ADD CONSTRAINT flow_logs_source_check
  CHECK (source IN ('power_automate','dispara_ai','gptmaker','system','user'));

-- ── Atualizar integration_health para incluir gptmaker ───────
ALTER TABLE integration_health DROP CONSTRAINT IF EXISTS integration_health_integration_check;
ALTER TABLE integration_health ADD CONSTRAINT integration_health_integration_check
  CHECK (integration IN ('power_automate','dispara_ai','gptmaker'));

INSERT INTO integration_health (integration, status, response_time_ms, success_rate, error_count)
VALUES ('gptmaker', 'healthy', 0, 100.00, 0)
ON CONFLICT (integration) DO NOTHING;
