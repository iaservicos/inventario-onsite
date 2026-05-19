-- Remove todas as restrições de unicidade conhecidas que podem causar erro de duplicidade
ALTER TABLE technician_items DROP CONSTRAINT IF EXISTS technician_items_technician_id_item_code_key;
ALTER TABLE technician_items DROP CONSTRAINT IF EXISTS technician_items_tech_item_remessa_key;

-- Garante que não existam outros índices únicos ocultos para estas colunas
DROP INDEX IF EXISTS idx_technician_items_unique_code;
DROP INDEX IF EXISTS technician_items_technician_id_item_code_idx;
