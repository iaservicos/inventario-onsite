# Importação de Dados de Combustível

## Estrutura Criada

Sistema completo para importação de dados de combustível baseado em relatórios Excel/CSV com validações e feedback detalhado.

### Arquivos Criados

#### 1. **Modelo/Schema** (`/lib/models/combustivel.js`)
- Definição da estrutura de dados de combustível
- Validação de registros com mensagens de erro detalhadas
- Normalização/sanitização de dados
- Mock database para testes
- Funções: `validateCombustivel()`, `normalizeCombustivel()`, `saveCombustivelBatch()`

**Campos:**
- `id` - Identificador único
- `data` - Data do abastecimento (YYYY-MM-DD)
- `placa` - Placa do veículo (ABC-1234)
- `motorista` - Nome do condutor
- `uf` - Estado (2 letras maiúsculas)
- `produto` - Tipo de combustível (Gasolina, Diesel, Etanol, Arla 32, GNV)
- `litros` - Quantidade abastecida
- `kmL` - Eficiência (km/l)
- `hodometro` - Km atual do veículo
- `vl_unit` - Valor unitário
- `vl_total` - Valor total
- `filial` - Identificação da filial
- `uso` - servico ou particular
- `createdAt`, `updatedAt` - Timestamps

#### 2. **Parser de Excel** (`/lib/xlsx-parser.js`)
- Parsing de arquivos .xlsx, .xls, .csv, .json
- Mapeamento automático de colunas (aceita variações de nomes)
- Validação de estrutura completa
- Retorna array de registros validados com erros detalhados

**Funções principais:**
- `parseFile(file)` - Parse genérico de arquivo
- `parseExcelData(excelData)` - Parse de dados Excel
- `mapHeaders(headers)` - Mapear colunas
- `validateImportStructure(parseResult)` - Validar estrutura completa

#### 3. **Helper Excel (Cliente)** (`/lib/xlsx-helper.js`)
- Funções para uso no frontend
- `parseExcelFile(file)` - Ler arquivo Excel/CSV com suporte a biblioteca xlsx
- `downloadExcelTemplate(filename)` - Download de template CSV

#### 4. **API de Importação** (`/app/api/frotas/combustivel/import/route.js`)
- Endpoint POST para receber dados
- Suporta FormData (arquivo) e JSON direto
- Validação completa de estrutura
- Retorna detalhamento de sucesso/erro

**Resposta de sucesso (200):**
```json
{
  "success": true,
  "imported": 45,
  "total": 50,
  "failed": 5,
  "message": "45 de 50 registros importados com sucesso",
  "details": {
    "summary": { "total": 50, "valid": 45, "invalid": 5 },
    "errors": [...],
    "warnings": null
  }
}
```

**Resposta de erro (400/500):**
```json
{
  "success": false,
  "error": "Mensagem de erro",
  "details": [...],
  "summary": {...}
}
```

#### 5. **Página de Importação** (`/app/(dashboard)/frotas/combustivel-import/page.js`)
- Interface completa para importação
- Download de template
- Upload com drag & drop
- Preview dos dados
- Feedback detalhado de importação

#### 6. **Componente Form** (`/app/(dashboard)/frotas/combustivel-import/ImportForm.js`)
- Formulário reutilizável
- Gerenciamento de estado
- Exibição de erros detalhados por linha

#### 7. **Botão na Página de Combustível**
- Adicionado botão "Importar Relatório" na página principal
- Link para `/frotas/combustivel-import`

---

## Uso

### Frontend

1. **Ir para página de importação:**
   ```
   /frotas/combustivel-import
   ```

2. **Baixar template** (botão na página)
   - Arquivo CSV pré-formatado

3. **Preencher dados:**
   - Seguir estrutura do template
   - Validações ocorrem no lado servidor

4. **Upload:**
   - Clicar ou arrastar arquivo
   - Confirmar importação
   - Ver resultado com detalhes

### API

**POST** `/api/frotas/combustivel/import`

**FormData (arquivo):**
```javascript
const formData = new FormData();
formData.append('file', file);

const response = await fetch('/api/frotas/combustivel/import', {
  method: 'POST',
  body: formData
});
```

**JSON direto:**
```javascript
const response = await fetch('/api/frotas/combustivel/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: [
      {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João',
        uf: 'SP',
        produto: 'Diesel',
        litros: 50,
        kmL: 5.5,
        hodometro: 45000,
        vl_unit: 5.80,
        vl_total: 290.00,
        filial: 'SP-01',
        uso: 'servico'
      }
    ]
  })
});
```

---

## Validações

### Por Campo

| Campo | Validação | Exemplo Válido |
|-------|-----------|-----------------|
| data | Data válida (YYYY-MM-DD) | 2026-06-19 |
| placa | Padrão ABC-1234 | ABC-1234 |
| motorista | Mín. 3 caracteres | João Silva |
| uf | Exatamente 2 letras maiúsculas | SP, RJ, MG |
| produto | Um de: Gasolina, Diesel, Etanol, Arla 32, GNV | Diesel |
| litros | Decimal > 0.1 | 50.5 |
| kmL | Decimal > 0.1 | 5.5 |
| hodometro | Inteiro >= 0 | 45000 |
| vl_unit | Decimal >= 0 | 5.80 |
| vl_total | Decimal >= 0 | 290.00 |
| filial | Mín. 2 caracteres | SP-01 |
| uso | servico ou particular | servico |

### Fluxo de Validação

1. **Parser:** Mapeia colunas Excel → estrutura padrão
2. **Normalização:** Sanitiza/formata dados (maiúsculas, trim, parsing números)
3. **Validação:** Verifica regras de negócio por campo
4. **Salvamento:** Insere registros válidos, retorna erros dos inválidos

### Tratamento de Erros

- **Erros parciais:** Status 207 (Multi-Status) com registros válidos salvos
- **Erros totais:** Status 400 com mensagens de erro
- **Erro servidor:** Status 500

Response sempre inclui:
- `imported` - Quantos registros foram salvos
- `total` - Total de linhas no arquivo
- `failed` - Quantos falharam
- `details.errors` - Array com erros por linha (máx. 10)

---

## Design

### Tema Monochromático
- Branco: #ffffff
- Preto: #000000
- Cinza escuro: #222222
- Cinza médio: #666666
- Cinza claro: #e5e5e5, #eeeeee, #cccccc
- Cinza muito claro: #f9f9f9, #fafafa
- Sucesso: #f0fdf4 (fundo), #155724 (texto)
- Erro: #fef2f2 (fundo), #721c24 (texto)

### Componentes
- Botões pretos com hover #222222
- Cards com borda #e5e5e5
- Input com borda #eeeeee
- Status com cores de sucesso/erro sutis

---

## Integração com Banco de Dados Real

### Passo 1: Modificar Modelo (`/lib/models/combustivel.js`)

Substituir mock database por chamadas reais:

```javascript
import { db } from '@/lib/db'; // Seu cliente DB

export async function saveCombustivelBatch(records) {
  try {
    const errors = [];
    let saved = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const validation = validateCombustivel(record);

      if (!validation.valid) {
        errors.push({
          rowIndex: i + 2,
          placa: record.placa,
          errors: validation.errors
        });
        continue;
      }

      const normalized = normalizeCombustivel(record);

      // Inserir no banco
      try {
        await db.combustivel.create({
          data: normalized
        });
        saved++;
      } catch (dbError) {
        errors.push({
          rowIndex: i + 2,
          placa: record.placa,
          errors: [dbError.message]
        });
      }
    }

    return {
      success: errors.length === 0,
      saved,
      total: records.length,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    return {
      success: false,
      saved: 0,
      total: records.length,
      error: error.message
    };
  }
}

export async function getCombustivelAll() {
  return await db.combustivel.findMany({
    orderBy: { data: 'desc' }
  });
}

export async function getCombustivelFiltered(filters = {}) {
  const where = {};

  if (filters.placa) where.placa = { contains: filters.placa.toUpperCase() };
  if (filters.motorista) where.motorista = { contains: filters.motorista.toUpperCase() };
  if (filters.uf) where.uf = filters.uf;
  if (filters.produto) where.produto = filters.produto;
  if (filters.uso) where.uso = filters.uso;

  if (filters.dataInicio && filters.dataFim) {
    where.data = {
      gte: new Date(filters.dataInicio),
      lte: new Date(filters.dataFim)
    };
  }

  return await db.combustivel.findMany({ where });
}
```

### Passo 2: Atualizar Página de Combustível

Carregar dados do banco em vez de mock:

```javascript
// /app/(dashboard)/frotas/combustivel/page.js

import { getCombustivelAll, getCombustivelFiltered } from '@/lib/models/combustivel';

export default function CombustvelPage() {
  // ... usar getCombustivelAll() ou getCombustivelFiltered()
}
```

### Passo 3: Schema Prisma (Exemplo)

```prisma
model Combustivel {
  id        String   @id @default(cuid())
  data      DateTime
  placa     String
  motorista String
  uf        String   @db.Char(2)
  produto   String
  litros    Float
  kmL       Float
  hodometro Int
  vl_unit   Float
  vl_total  Float
  filial    String
  uso       String   @db.Char(8) // 'servico' ou 'particular'
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([placa])
  @@index([data])
  @@index([motorista])
}
```

---

## Estrutura de Arquivo Excel Esperada

### Formato CSV (padrão)
```csv
Data,Placa,Motorista,UF,Produto,Litros,Km/L,Hodômetro,Vl.Unit,Vl.Total,Filial
2026-06-19,ABC-1234,João Silva,SP,Diesel,50,5.5,45000,5.80,290.00,SP-01
2026-06-19,XYZ-5678,Maria Santos,RJ,Gasolina,40,8.2,32000,5.50,220.00,RJ-02
```

### Variações Aceitas de Nomes de Coluna

O parser aceita variações automáticas:
- `data` = `date`, `data_abastecimento`
- `placa` = `vehicle`, `veiculo`, `plate`
- `motorista` = `driver`, `condutor`
- `uf` = `estado`, `state`, `uf_origem`
- `produto` = `product`, `tipo_combustivel`, `combustivel`
- `litros` = `liters`, `quantidade`, `qty`
- `kmL` = `km/l`, `km_l`, `kml`, `eficiencia`
- `hodometro` = `hodometer`, `km_atual`, `km`
- `vl_unit` = `vl.unit`, `vl_unit`, `valor_unitario`, `unit_value`, `unit_price`
- `vl_total` = `vl.total`, `vl_total`, `valor_total`, `total_value`, `total`
- `filial` = `branch`, `sucursal`, `local`

---

## Performance

- **Upload:** Suporta arquivos com até ~10K linhas (depende do servidor)
- **Validação:** Paralela por linha, feedback individual
- **Resposta:** Inclui apenas primeiros 10 erros (otimizar payload)

---

## Próximos Passos

1. Integrar com banco de dados real (Prisma + PostgreSQL recomendado)
2. Adicionar autenticação/autorização na API
3. Implementar import assíncrono para arquivos grandes
4. Adicionar fila (Bull/RabbitMQ) para processamento em background
5. Criar webhooks para notificações de conclusão
6. Adicionar exportação de dados (relatórios)
7. Implementar reconciliação automática com notas fiscais
