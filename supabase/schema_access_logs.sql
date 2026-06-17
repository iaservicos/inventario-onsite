-- Tabela de logs de acesso
CREATE TABLE IF NOT EXISTS user_access_logs (
  id          BIGSERIAL PRIMARY KEY,
  user_email  TEXT,
  user_name   TEXT,
  user_role   TEXT,
  event_type  TEXT NOT NULL, -- 'login', 'page_view', 'action'
  page_path   TEXT,
  action_detail TEXT,
  ip_address  TEXT,
  city        TEXT,
  region      TEXT,
  country     TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_logs_created_at  ON user_access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_logs_user_email  ON user_access_logs(user_email);
CREATE INDEX IF NOT EXISTS idx_access_logs_event_type  ON user_access_logs(event_type);
