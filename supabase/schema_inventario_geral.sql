-- Adiciona inventory_type nas tabelas de agendamento e inventario
-- 'subgroup' = inventario parcial por subgrupo (padrao existente)
-- 'general'  = inventario total com todas as pecas do tecnico

ALTER TABLE inventory_schedules
  ADD COLUMN IF NOT EXISTS inventory_type TEXT DEFAULT 'subgroup';

ALTER TABLE inventories
  ADD COLUMN IF NOT EXISTS inventory_type TEXT DEFAULT 'subgroup';
