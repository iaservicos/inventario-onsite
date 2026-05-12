-- ============================================================
-- INVENTÁRIO ONSITE — Schema Supabase (PostgreSQL)
-- Execute este arquivo no SQL Editor do Supabase
-- ============================================================

-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Usuários do sistema ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'supervisor', 'coordinator')) DEFAULT 'supervisor',
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Técnicos de campo ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS technicians (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  region     TEXT,
  phone      TEXT,
  email      TEXT,
  active     BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Inventários ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventories (
  id               SERIAL PRIMARY KEY,
  technician_id    INTEGER NOT NULL REFERENCES technicians(id),
  status           TEXT NOT NULL CHECK (status IN ('pending','in_progress','completed','abandoned','recount_pending')) DEFAULT 'pending',
  week_ref         TEXT,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  abandoned_at     TIMESTAMPTZ,
  total_items      INTEGER DEFAULT 0,
  counted_items    INTEGER DEFAULT 0,
  divergence_count INTEGER DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Itens do inventário ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id             SERIAL PRIMARY KEY,
  inventory_id   INTEGER NOT NULL REFERENCES inventories(id) ON DELETE CASCADE,
  item_code      TEXT NOT NULL,
  item_name      TEXT NOT NULL,
  system_qty     NUMERIC(10,2) NOT NULL DEFAULT 0,
  physical_qty   NUMERIC(10,2),
  has_divergence BOOLEAN DEFAULT false,
  status         TEXT NOT NULL CHECK (status IN ('pending','counted','recount','validated')) DEFAULT 'pending',
  counted_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Alertas ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id             SERIAL PRIMARY KEY,
  type           TEXT NOT NULL CHECK (type IN ('abandonment','recount_pending','divergence_critical','integration_error','timeout')),
  severity       TEXT NOT NULL CHECK (severity IN ('low','medium','high','critical')) DEFAULT 'medium',
  technician_id  INTEGER REFERENCES technicians(id),
  inventory_id   INTEGER REFERENCES inventories(id),
  title          TEXT NOT NULL,
  description    TEXT,
  resolved       BOOLEAN NOT NULL DEFAULT false,
  resolved_at    TIMESTAMPTZ,
  resolved_by    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Divergências ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS divergences (
  id              SERIAL PRIMARY KEY,
  inventory_id    INTEGER NOT NULL REFERENCES inventories(id),
  technician_id   INTEGER NOT NULL REFERENCES technicians(id),
  item_code       TEXT NOT NULL,
  item_name       TEXT NOT NULL,
  system_qty      NUMERIC(10,2) NOT NULL,
  physical_qty    NUMERIC(10,2) NOT NULL,
  difference      NUMERIC(10,2) NOT NULL,
  percentage_diff NUMERIC(5,2),
  status          TEXT NOT NULL CHECK (status IN ('open','recount','validated','adjusted')) DEFAULT 'open',
  recount_qty     NUMERIC(10,2),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Log de eventos do fluxo ──────────────────────────────────
CREATE TABLE IF NOT EXISTS flow_logs (
  id             SERIAL PRIMARY KEY,
  source         TEXT NOT NULL CHECK (source IN ('power_automate','dispara_ai','system','user')),
  level          TEXT NOT NULL CHECK (level IN ('info','warning','error','success')),
  action         TEXT NOT NULL,
  technician_id  INTEGER REFERENCES technicians(id),
  inventory_id   INTEGER REFERENCES inventories(id),
  message        TEXT NOT NULL,
  details        JSONB,
  retry_count    INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Saúde das integrações ────────────────────────────────────
CREATE TABLE IF NOT EXISTS integration_health (
  id               SERIAL PRIMARY KEY,
  integration      TEXT NOT NULL UNIQUE CHECK (integration IN ('power_automate','dispara_ai')),
  status           TEXT NOT NULL CHECK (status IN ('healthy','degraded','down')) DEFAULT 'healthy',
  last_check       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  response_time_ms INTEGER,
  success_rate     NUMERIC(5,2),
  error_count      INTEGER DEFAULT 0,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Índices ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_inventories_technician ON inventories(technician_id);
CREATE INDEX IF NOT EXISTS idx_inventories_status ON inventories(status);
CREATE INDEX IF NOT EXISTS idx_inventories_created ON inventories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_technician ON alerts(technician_id);
CREATE INDEX IF NOT EXISTS idx_divergences_technician ON divergences(technician_id);
CREATE INDEX IF NOT EXISTS idx_divergences_status ON divergences(status);
CREATE INDEX IF NOT EXISTS idx_flow_logs_source ON flow_logs(source);
CREATE INDEX IF NOT EXISTS idx_flow_logs_created ON flow_logs(created_at DESC);

-- ── Dados iniciais: integrações ──────────────────────────────
INSERT INTO integration_health (integration, status, response_time_ms, success_rate, error_count)
VALUES
  ('power_automate', 'healthy', 320, 98.50, 1),
  ('dispara_ai',     'degraded', 1850, 91.20, 4)
ON CONFLICT (integration) DO NOTHING;

-- ── Usuário administrador padrão ─────────────────────────────
-- Senha padrão: Admin@2025 (troque imediatamente após o primeiro login)
-- Hash gerado com bcrypt rounds=10
INSERT INTO users (name, email, password_hash, role)
VALUES (
  'Administrador',
  'admin@inventarioonsite.com.br',
  '$2a$10$7WG5wCAaYulNZpmWmQYZXOM4yRew1PIK8rAFCLJ4ANWufcSA5AcTS',
  'admin'
)
ON CONFLICT (email) DO NOTHING;
