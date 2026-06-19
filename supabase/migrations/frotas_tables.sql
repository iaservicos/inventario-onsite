-- ============================================================================
-- FROTAS TABLES - Supabase Migration
-- ============================================================================

-- 1. VEICULOS (Frota Principal)
CREATE TABLE veiculos (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) UNIQUE NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  marca VARCHAR(50),
  ano INTEGER,
  km_atual INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'Ativo', -- Ativo, Parado, Manutenção, Descartado
  combustivel INTEGER DEFAULT 0,
  ultima_manutencao DATE,
  proxima_manutencao DATE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. COMBUSTIVEIS (Consumo/Abastecimento - seu relatório Excel)
CREATE TABLE combustiveis (
  id BIGSERIAL PRIMARY KEY,
  data DATE NOT NULL,
  placa VARCHAR(10) NOT NULL,
  motorista VARCHAR(100),
  uf VARCHAR(2),
  produto VARCHAR(50), -- Gasolina, Diesel, Etanol, GNV, Arla 32
  litros DECIMAL(10,2),
  km_l DECIMAL(10,2),
  hodometro INTEGER,
  vl_unit DECIMAL(10,2),
  vl_total DECIMAL(10,2),
  filial VARCHAR(100),
  uso VARCHAR(20) DEFAULT 'servico', -- servico ou particular
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- 3. MANUTENCOES
CREATE TABLE manutencoes (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  tipo VARCHAR(50), -- Revisão, Troca Óleo, IPVA, Seguro, Pneu, Outro
  data_realizada DATE,
  proxima_preventiva DATE,
  km INTEGER,
  valor DECIMAL(10,2),
  status VARCHAR(50), -- Vencida, Próx. 30d, Em dia
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- 4. MOVIMENTACOES (Transferências de veículos)
CREATE TABLE movimentacoes (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  tecnico_anterior VARCHAR(100),
  tecnico_atual VARCHAR(100),
  data_movimentacao DATE,
  registrado_por VARCHAR(100),
  motivo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- 5. FOTOS_HODOMETRO (Validação de fotos)
CREATE TABLE fotos_hodometro (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  url_foto TEXT,
  hodometro INTEGER,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, aprovado, rejeitado
  data_upload TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  data_validacao TIMESTAMP,
  validado_por VARCHAR(100),
  motivo_rejeicao TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- 6. DEVOLUCOES (Devolução de veículos)
CREATE TABLE devolucoes (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  tecnico VARCHAR(100),
  hodometro INTEGER,
  motivo TEXT,
  data_devolucao DATE,
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- 7. DESPESAS (Financeiro - multas, manutenção, etc)
CREATE TABLE despesas (
  id BIGSERIAL PRIMARY KEY,
  placa VARCHAR(10) NOT NULL,
  tipo VARCHAR(50), -- multa, manutencao, outro
  descricao TEXT,
  valor DECIMAL(10,2),
  data_despesa DATE,
  status VARCHAR(50) DEFAULT 'pendente', -- pendente, pago
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (placa) REFERENCES veiculos(placa) ON DELETE CASCADE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_combustiveis_placa ON combustiveis(placa);
CREATE INDEX idx_combustiveis_data ON combustiveis(data);
CREATE INDEX idx_manutencoes_placa ON manutencoes(placa);
CREATE INDEX idx_movimentacoes_placa ON movimentacoes(placa);
CREATE INDEX idx_fotos_placa ON fotos_hodometro(placa);
CREATE INDEX idx_devolucoes_placa ON devolucoes(placa);
CREATE INDEX idx_despesas_placa ON despesas(placa);
CREATE INDEX idx_veiculos_status ON veiculos(status);

-- ============================================================================
-- Enable RLS (Row Level Security)
-- ============================================================================

ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE combustiveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE fotos_hodometro ENABLE ROW LEVEL SECURITY;
ALTER TABLE devolucoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;

-- Policy: Allow SELECT to authenticated users
CREATE POLICY "SELECT frotas" ON veiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT combustiveis" ON combustiveis FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT manutencoes" ON manutencoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT movimentacoes" ON movimentacoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT fotos" ON fotos_hodometro FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT devolucoes" ON devolucoes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "SELECT despesas" ON despesas FOR SELECT USING (auth.role() = 'authenticated');

-- Policy: Allow INSERT to authenticated users
CREATE POLICY "INSERT frotas" ON veiculos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT combustiveis" ON combustiveis FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT manutencoes" ON manutencoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT movimentacoes" ON movimentacoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT fotos" ON fotos_hodometro FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT devolucoes" ON devolucoes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "INSERT despesas" ON despesas FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy: Allow UPDATE to authenticated users
CREATE POLICY "UPDATE frotas" ON veiculos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE combustiveis" ON combustiveis FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE manutencoes" ON manutencoes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE movimentacoes" ON movimentacoes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE fotos" ON fotos_hodometro FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE devolucoes" ON devolucoes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "UPDATE despesas" ON despesas FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy: Allow DELETE to authenticated users
CREATE POLICY "DELETE frotas" ON veiculos FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE combustiveis" ON combustiveis FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE manutencoes" ON manutencoes FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE movimentacoes" ON movimentacoes FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE fotos" ON fotos_hodometro FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE devolucoes" ON devolucoes FOR DELETE USING (auth.role() = 'authenticated');
CREATE POLICY "DELETE despesas" ON despesas FOR DELETE USING (auth.role() = 'authenticated');
