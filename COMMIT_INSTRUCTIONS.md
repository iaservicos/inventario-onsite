# Instruções de Commit - Importação de Combustível

## Arquivos Criados/Modificados

### Criados (11 arquivos)
1. `/lib/models/combustivel.js` - Modelo com validações e mock DB
2. `/lib/xlsx-parser.js` - Parser de Excel/CSV/JSON
3. `/lib/xlsx-helper.js` - Helper para cliente
4. `/app/api/frotas/combustivel/import/route.js` - API de importação
5. `/app/(dashboard)/frotas/combustivel-import/page.js` - Página de importação
6. `/app/(dashboard)/frotas/combustivel-import/ImportForm.js` - Componente form
7. `/lib/models/__tests__/combustivel.test.js` - Testes
8. `/examples/combustivel-import-example.js` - Exemplos de uso
9. `COMBUSTIVEL_IMPORT.md` - Documentação completa
10. `COMBUSTIVEL_IMPORT_QUICK_START.md` - Guia rápido
11. `COMBUSTIVEL_IMPORT_FILES.txt` - Lista de arquivos

### Modificados (1 arquivo)
- `/app/(dashboard)/frotas/combustivel/page.js` - Adicionado botão "Importar Relatório"

## Comando de Commit

```bash
git add -A
git commit -m "feat: implement complete fuel import system with validation and preview

- Add combustivel.js model with comprehensive field validation
- Add xlsx-parser.js for Excel/CSV/JSON parsing with auto column mapping
- Add xlsx-helper.js client-side utilities for file handling
- Add POST /api/frotas/combustivel/import endpoint with full validation
- Add combustivel-import page with template download and drag-drop upload
- Add ImportForm component with data preview and error feedback
- Add button 'Importar Relatório' to main combustível page
- Add comprehensive documentation (COMBUSTIVEL_IMPORT.md)
- Add test suite covering validation, normalization, and batch operations
- Add examples and quick start guide
- Support for .xlsx, .xls, .csv, .json formats
- Monochromatic design (black, white, gray only)
- Mock database ready for real DB integration

Fields validated:
- Data (YYYY-MM-DD)
- Placa (ABC-1234)
- Motorista (min 3 chars)
- UF (2 lettres)
- Produto (enum: Gasolina, Diesel, Etanol, Arla 32, GNV)
- Litros (decimal)
- Km/L (decimal)
- Hodometro (integer)
- Vl.Unit (decimal)
- Vl.Total (decimal)
- Filial (min 2 chars)
- Uso (servico/particular)"
```

## Ou em Etapas

```bash
# Adicionar arquivos de modelo e utilitários
git add lib/models/combustivel.js lib/xlsx-parser.js lib/xlsx-helper.js

# Adicionar API
git add app/api/frotas/combustivel/import/route.js

# Adicionar páginas e componentes
git add app/\(dashboard\)/frotas/combustivel-import/ app/\(dashboard\)/frotas/combustivel/page.js

# Adicionar testes e exemplos
git add lib/models/__tests__/ examples/combustivel-import-example.js

# Adicionar documentação
git add COMBUSTIVEL_IMPORT.md COMBUSTIVEL_IMPORT_QUICK_START.md COMBUSTIVEL_IMPORT_FILES.txt

# Fazer commit
git commit -m "feat: complete fuel import system with validation"
```

## Verificar o que vai ser commitado

```bash
git status
```

## Ver mudanças antes de committar

```bash
git diff --cached
```

## Depois do Commit

1. Push para branch: `git push origin main`
2. Acessar `/frotas/combustivel-import` para testar
3. Baixar template e testar importação

## Rollback (se necessário)

```bash
# Desfazer o último commit (mantém os arquivos)
git reset --soft HEAD~1

# Desfazer o último commit (remove os arquivos)
git reset --hard HEAD~1
```

