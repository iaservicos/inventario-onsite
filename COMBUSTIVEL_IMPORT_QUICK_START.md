# Importação de Combustível - Quick Start

## Estrutura Criada ✓

```
/lib/
  ├── models/
  │   └── combustivel.js          # Modelo com validações
  ├── xlsx-parser.js              # Parser de Excel/CSV/JSON
  └── xlsx-helper.js              # Helper para cliente (parseExcelFile, download)

/app/api/frotas/combustivel/
  └── import/
      └── route.js                # API POST /api/frotas/combustivel/import

/app/(dashboard)/frotas/
  ├── combustivel/
  │   └── page.js                 # Página principal (com botão "Importar Relatório")
  └── combustivel-import/
      ├── page.js                 # Página de importação
      └── ImportForm.js           # Componente reutilizável
```

## Usar a Feature

### 1. Acessar página de importação
```
/frotas/combustivel-import
```

### 2. Fluxo do usuário
1. Clicar em "Baixar Template CSV"
2. Preencher dados seguindo estrutura
3. Arrastar arquivo ou clicar para selecionar
4. Confirmar importação
5. Ver resultado com feedback detalhado

### 3. API para integração

**POST** `/api/frotas/combustivel/import`

**FormData (arquivo):**
```javascript
const formData = new FormData();
formData.append('file', file); // .xlsx, .xls, .csv, .json

const res = await fetch('/api/frotas/combustivel/import', {
  method: 'POST',
  body: formData
});
```

**JSON direto:**
```javascript
await fetch('/api/frotas/combustivel/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    data: [
      {
        data: '2026-06-19',
        placa: 'ABC-1234',
        motorista: 'João Silva',
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

## Campos Obrigatórios

| Campo | Tipo | Formato | Exemplo |
|-------|------|---------|---------|
| data | date | YYYY-MM-DD | 2026-06-19 |
| placa | string | ABC-1234 | ABC-1234 |
| motorista | string | min 3 chars | João Silva |
| uf | string | 2 letras | SP |
| produto | enum | Gasolina \| Diesel \| Etanol \| Arla 32 \| GNV | Diesel |
| litros | number | > 0.1 | 50.5 |
| kmL | number | > 0.1 | 5.5 |
| hodometro | int | >= 0 | 45000 |
| vl_unit | number | >= 0 | 5.80 |
| vl_total | number | >= 0 | 290.00 |
| filial | string | min 2 chars | SP-01 |
| uso | enum | servico \| particular | servico |

## Resposta da API

**Sucesso (200/207):**
```json
{
  "success": true,
  "imported": 45,
  "total": 50,
  "failed": 5,
  "message": "45 de 50 registros importados com sucesso",
  "details": {
    "summary": { "total": 50, "valid": 45, "invalid": 5 },
    "errors": [
      {
        "rowIndex": 12,
        "placa": "INV-1234",
        "errors": ["Placa inválida: INV-1234"]
      }
    ]
  }
}
```

**Erro (400/500):**
```json
{
  "success": false,
  "error": "Descrição do erro",
  "details": {...}
}
```

## Design

**Monochromático:**
- Preto: #000000
- Branco: #ffffff
- Cinza: #666666, #e5e5e5, #cccccc
- Sucesso: #f0fdf4 (fundo)
- Erro: #fef2f2 (fundo)

**Botões:**
- Preto com hover #222222
- Texto branco
- Sem cores vibrantes

## Variações Aceitas de Nomes de Coluna

O parser detecta automaticamente:
- `data` = date, data_abastecimento
- `placa` = vehicle, veiculo, plate
- `motorista` = driver, condutor
- `uf` = estado, state
- `produto` = product, combustivel
- `litros` = liters, quantidade, qty
- `kmL` = km/l, kml, eficiencia
- `hodometro` = km, km_atual
- `vl_unit` = valor_unitario, unit_price, unit_value
- `vl_total` = valor_total, total_value, total
- `filial` = branch, sucursal, local

## Integração com DB

Substituir mock database em `/lib/models/combustivel.js`:

```javascript
// De:
let mockDatabase = [];

// Para:
import { prisma } from '@/lib/db';

export async function saveCombustivelBatch(records) {
  const saved = await prisma.combustivel.createMany({
    data: records
  });
  return { success: true, saved: saved.count, ... };
}
```

Ver `COMBUSTIVEL_IMPORT.md` para detalhes completos.

## Testes

```bash
npm test -- combustivel.test.js
```

Arquivo: `/lib/models/__tests__/combustivel.test.js`

## Exemplos

Arquivo: `/examples/combustivel-import-example.js`

## Próximos Passos

1. [ ] Conectar com banco de dados (Prisma + PostgreSQL)
2. [ ] Adicionar autenticação na API
3. [ ] Implementar import assíncrono para arquivos grandes
4. [ ] Criar relatórios/exportação
5. [ ] Adicionar reconciliação com notas fiscais
