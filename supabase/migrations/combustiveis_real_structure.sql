-- ============================================================================
-- COMBUSTIVEIS TABLE - Estrutura Real do Relatório de Análise de Consumo
-- ============================================================================

-- Criar tabela com estrutura do Excel real
CREATE TABLE combustiveis (
  id BIGSERIAL PRIMARY KEY,

  -- Identificação do Veículo
  placa VARCHAR(20) NOT NULL,
  modelo VARCHAR(100),
  fabricante VARCHAR(100),
  tipo_frota VARCHAR(50),

  -- Dados do Abastecimento
  data TIMESTAMP NOT NULL,
  numero_cartao VARCHAR(50),

  -- Motorista
  matricula VARCHAR(20),
  motorista VARCHAR(200),

  -- Local
  terminal VARCHAR(50),
  estabelecimento VARCHAR(200),
  cidade VARCHAR(100),
  uf VARCHAR(2),

  -- Produto e Consumo
  produto VARCHAR(100),
  quantidade DECIMAL(10,2),
  valor_unitario DECIMAL(10,2),
  valor_total DECIMAL(10,2),

  -- Eficiência
  distancia INTEGER,
  consumo DECIMAL(10,2),
  unidade VARCHAR(20),
  hodometro INTEGER,

  -- Fiscal
  cupom_fiscal VARCHAR(50),

  -- Gestão
  centro_resultado VARCHAR(100),
  filial VARCHAR(200),
  centro_custo VARCHAR(100),

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_combustiveis_placa ON combustiveis(placa);
CREATE INDEX idx_combustiveis_data ON combustiveis(data);
CREATE INDEX idx_combustiveis_motorista ON combustiveis(motorista);
CREATE INDEX idx_combustiveis_uf ON combustiveis(uf);

-- RLS
ALTER TABLE combustiveis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "SELECT combustiveis" ON combustiveis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "INSERT combustiveis" ON combustiveis FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "UPDATE combustiveis" ON combustiveis FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE combustiveis" ON combustiveis FOR DELETE USING (auth.role() = 'authenticated');
