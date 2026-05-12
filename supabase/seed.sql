-- ============================================================
-- SEED — Dados de demonstração
-- Execute APÓS o schema.sql
-- ============================================================

-- Técnicos
INSERT INTO technicians (name, region, phone, email) VALUES
  ('Carlos Mendes',   'SP - Capital',  '(11) 99001-0001', 'carlos.mendes@empresa.com'),
  ('Fernanda Lima',   'SP - Interior', '(11) 99001-0002', 'fernanda.lima@empresa.com'),
  ('Juliana Costa',   'MG',            '(31) 99001-0003', 'juliana.costa@empresa.com'),
  ('Marcos Oliveira', 'PR',            '(41) 99001-0004', 'marcos.oliveira@empresa.com'),
  ('Patrícia Alves',  'RS',            '(51) 99001-0005', 'patricia.alves@empresa.com'),
  ('Rafael Souza',    'RJ',            '(21) 99001-0006', 'rafael.souza@empresa.com')
ON CONFLICT DO NOTHING;

-- Inventários
INSERT INTO inventories (technician_id, status, week_ref, started_at, completed_at, total_items, counted_items, divergence_count) VALUES
  (1, 'completed',       'S01-2026', NOW() - INTERVAL '2 days 1 hour', NOW() - INTERVAL '2 days',        10, 10, 2),
  (2, 'completed',       'S01-2026', NOW() - INTERVAL '2 days 2 hour', NOW() - INTERVAL '2 days 45 min', 10, 10, 0),
  (3, 'in_progress',     'S01-2026', NOW() - INTERVAL '6 hours',       NULL,                             10,  8, 0),
  (4, 'abandoned',       'S01-2026', NOW() - INTERVAL '5 hours 30 min', NOW() - INTERVAL '5 hours',      10,  3, 0),
  (5, 'recount_pending', 'S01-2026', NOW() - INTERVAL '4 hours 30 min', NOW() - INTERVAL '15 min',       10, 10, 3),
  (6, 'completed',       'S01-2026', NOW() - INTERVAL '3 hours',       NOW() - INTERVAL '1 hour 30 min', 10, 10, 0);

-- Alertas
INSERT INTO alerts (type, severity, technician_id, inventory_id, title, description) VALUES
  ('abandonment',      'high',   4, 4, 'Abandono de inventário — Marcos Oliveira', 'Técnico abandonou o inventário da semana S01-2026 após 30 minutos sem completar.'),
  ('recount_pending',  'medium', 5, 5, 'Recontagem pendente — Patrícia Alves',     '3 itens com divergência aguardando recontagem há mais de 4 horas.');

-- Divergências
INSERT INTO divergences (inventory_id, technician_id, item_code, item_name, system_qty, physical_qty, difference, percentage_diff, status) VALUES
  (5, 5, 'PT-001', 'Cabo de Rede Cat6',  50, 49, -1, 2.00,  'recount'),
  (5, 5, 'PT-002', 'Switch 24 Portas',    5,  3, -2, 40.00, 'recount'),
  (5, 5, 'PT-003', 'Roteador Wi-Fi',      8,  5, -3, 37.50, 'recount'),
  (1, 1, 'PT-001', 'Cabo de Rede Cat6',  50, 49, -1, 2.00,  'open'),
  (1, 1, 'PT-002', 'Switch 24 Portas',    5,  3, -2, 40.00, 'open');

-- Logs de fluxo
INSERT INTO flow_logs (source, level, action, technician_id, inventory_id, message) VALUES
  ('power_automate', 'success', 'inventory_started',    1, 1, 'Inventário iniciado para Carlos Mendes — S01-2026'),
  ('dispara_ai',     'success', 'message_sent',         1, 1, 'Mensagem de início enviada via WhatsApp'),
  ('power_automate', 'success', 'inventory_completed',  1, 1, 'Inventário concluído — 10/10 itens contados'),
  ('power_automate', 'success', 'inventory_started',    2, 2, 'Inventário iniciado para Fernanda Lima — S01-2026'),
  ('dispara_ai',     'success', 'message_sent',         2, 2, 'Mensagem de início enviada via WhatsApp'),
  ('power_automate', 'success', 'inventory_completed',  2, 2, 'Inventário concluído — 10/10 itens contados'),
  ('power_automate', 'success', 'inventory_started',    3, 3, 'Inventário iniciado para Juliana Costa — S01-2026'),
  ('dispara_ai',     'info',    'message_sent',         3, 3, 'Lembrete enviado — inventário em andamento há 6h'),
  ('power_automate', 'warning', 'inventory_started',    4, 4, 'Inventário iniciado para Marcos Oliveira — S01-2026'),
  ('power_automate', 'error',   'inventory_abandoned',  4, 4, 'Abandono detectado — inventário incompleto após timeout'),
  ('dispara_ai',     'error',   'alert_sent',           4, 4, 'Alerta de abandono enviado ao supervisor'),
  ('power_automate', 'success', 'inventory_started',    5, 5, 'Inventário iniciado para Patrícia Alves — S01-2026'),
  ('power_automate', 'warning', 'divergence_detected',  5, 5, '3 divergências detectadas — recontagem solicitada'),
  ('dispara_ai',     'success', 'message_sent',         5, 5, 'Solicitação de recontagem enviada via WhatsApp'),
  ('power_automate', 'success', 'inventory_started',    6, 6, 'Inventário iniciado para Rafael Souza — S01-2026'),
  ('power_automate', 'success', 'inventory_completed',  6, 6, 'Inventário concluído — 10/10 itens contados');
