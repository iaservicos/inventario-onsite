-- ============================================================================
-- ALTER COMBUSTIVEIS TABLE - Adicionar colunas da estrutura real
-- ============================================================================

-- Adicionar colunas que faltam
ALTER TABLE combustiveis
ADD COLUMN IF NOT EXISTS numero_cartao VARCHAR(50),
ADD COLUMN IF NOT EXISTS matricula VARCHAR(20),
ADD COLUMN IF NOT EXISTS tipo_frota VARCHAR(50),
ADD COLUMN IF NOT EXISTS modelo VARCHAR(100),
ADD COLUMN IF NOT EXISTS fabricante VARCHAR(100),
ADD COLUMN IF NOT EXISTS terminal VARCHAR(50),
ADD COLUMN IF NOT EXISTS estabelecimento VARCHAR(200),
ADD COLUMN IF NOT EXISTS cidade VARCHAR(100),
ADD COLUMN IF NOT EXISTS distancia INTEGER,
ADD COLUMN IF NOT EXISTS consumo DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS unidade VARCHAR(20),
ADD COLUMN IF NOT EXISTS cupom_fiscal VARCHAR(50),
ADD COLUMN IF NOT EXISTS centro_resultado VARCHAR(100),
ADD COLUMN IF NOT EXISTS centro_custo VARCHAR(100);

-- Renomear colunas se necessário
-- ALTER TABLE combustiveis RENAME COLUMN km_l TO consumo;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_combustiveis_motorista ON combustiveis(motorista);
CREATE INDEX IF NOT EXISTS idx_combustiveis_cidade ON combustiveis(cidade);
