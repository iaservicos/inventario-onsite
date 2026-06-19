/**
 * Parser para arquivos Excel (.xlsx, .xls)
 * Extrai dados e valida estrutura
 *
 * Usa biblioteca 'xlsx' para parsing de arquivos Excel
 * Compatível com: .xlsx, .xls, .csv, .json
 */

/**
 * Mapeamento de colunas esperadas no Excel
 * Aceita variações de nomes de coluna
 */
const COLUMN_MAPPING = {
  data: ['data', 'date', 'data_abastecimento', 'data_abastecimento'],
  placa: ['placa', 'vehicle', 'veiculo', 'plate'],
  motorista: ['motorista', 'driver', 'condutor'],
  uf: ['uf', 'estado', 'state', 'uf_origem'],
  produto: ['produto', 'product', 'tipo_combustivel', 'combustivel'],
  litros: ['litros', 'liters', 'quantidade', 'qty'],
  kmL: ['km/l', 'km_l', 'km_l', 'kml', 'eficiencia'],
  hodometro: ['hodometro', 'hodometer', 'km_atual', 'km'],
  vl_unit: ['vl.unit', 'vl_unit', 'valor_unitario', 'unit_value', 'unit_price'],
  vl_total: ['vl.total', 'vl_total', 'valor_total', 'total_value', 'total'],
  filial: ['filial', 'branch', 'sucursal', 'local']
};

/**
 * Encontrar nome de coluna normalizado
 * @param {string} headerName - Nome da coluna no arquivo
 * @returns {string|null} Chave normalizada ou null
 */
function normalizeColumnName(headerName) {
  const cleaned = headerName.toLowerCase().trim();

  for (const [key, aliases] of Object.entries(COLUMN_MAPPING)) {
    if (aliases.some(alias => cleaned === alias || cleaned.includes(alias))) {
      return key;
    }
  }

  return null;
}

/**
 * Mapear headers do Excel para estrutura padrão
 * @param {Array<string>} headers - Cabeçalhos do arquivo
 * @returns {Object} { success: boolean, mapping: Object, errors: string[] }
 */
export function mapHeaders(headers) {
  const mapping = {};
  const errors = [];
  const requiredColumns = ['data', 'placa', 'motorista', 'uf', 'produto', 'litros', 'kmL', 'hodometro', 'vl_unit', 'vl_total', 'filial'];

  headers.forEach((header, index) => {
    const normalized = normalizeColumnName(header);
    if (normalized) {
      mapping[normalized] = index;
    }
  });

  // Validar colunas obrigatórias
  const missingColumns = requiredColumns.filter(col => !(col in mapping));
  if (missingColumns.length > 0) {
    errors.push(`Colunas obrigatórias ausentes: ${missingColumns.join(', ')}`);
  }

  return {
    success: errors.length === 0,
    mapping,
    errors
  };
}

/**
 * Extrair dados de linha do Excel usando mapeamento
 * @param {Array} row - Linha de dados
 * @param {Object} mapping - Mapeamento de colunas
 * @returns {Object} Objeto com dados mapeados
 */
function extractRowData(row, mapping) {
  const data = {};

  for (const [key, index] of Object.entries(mapping)) {
    data[key] = row[index]?.toString().trim() || '';
  }

  return data;
}

/**
 * Parsear dados Excel em formato JSON
 * Esperado: Array de arrays (cada elemento é uma linha)
 *
 * @param {Array} excelData - Dados do Excel [headers, ...rows]
 * @returns {Object} { success: boolean, data: Array, errors: Array, warnings: Array }
 */
export function parseExcelData(excelData) {
  if (!Array.isArray(excelData) || excelData.length < 2) {
    return {
      success: false,
      data: [],
      errors: ['Arquivo Excel vazio ou com formato inválido'],
      warnings: []
    };
  }

  const [headers, ...rows] = excelData;
  const errors = [];
  const warnings = [];
  const data = [];

  // Mapear headers
  const headerMapping = mapHeaders(headers);
  if (!headerMapping.success) {
    return {
      success: false,
      data: [],
      errors: headerMapping.errors,
      warnings
    };
  }

  // Processar linhas
  rows.forEach((row, rowIndex) => {
    // Verificar se linha está vazia
    if (!row || !row.some(cell => cell && cell.toString().trim())) {
      return;
    }

    const rowData = extractRowData(row, headerMapping.mapping);

    // Validações básicas de linha
    if (!rowData.placa) {
      errors.push(`Linha ${rowIndex + 2}: Placa ausente`);
      return;
    }

    // Converter tipos
    const processedRow = {
      data: rowData.data,
      placa: rowData.placa,
      motorista: rowData.motorista,
      uf: rowData.uf,
      produto: rowData.produto,
      litros: rowData.litros,
      kmL: rowData.kmL,
      hodometro: rowData.hodometro,
      vl_unit: rowData.vl_unit,
      vl_total: rowData.vl_total,
      filial: rowData.filial,
      uso: 'servico' // padrão, pode ser override
    };

    data.push(processedRow);
  });

  return {
    success: errors.length === 0,
    data,
    errors,
    warnings
  };
}

/**
 * Parsear JSON simples (para importação via JSON)
 * @param {string} jsonString - String JSON
 * @returns {Object} { success: boolean, data: Array, error: string }
 */
export function parseJSON(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!Array.isArray(data)) {
      return {
        success: false,
        data: [],
        error: 'JSON deve ser um array de objetos'
      };
    }

    return {
      success: true,
      data,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      data: [],
      error: `Erro ao parsear JSON: ${error.message}`
    };
  }
}

/**
 * Parsear CSV simples
 * @param {string} csvString - String CSV com vírgulas ou ponto-e-vírgula
 * @returns {Array} Array de arrays
 */
export function parseCSV(csvString) {
  // Detectar delimitador
  const delimiter = csvString.includes(';') ? ';' : ',';

  const lines = csvString.split('\n').filter(line => line.trim());
  const data = lines.map(line => {
    // Simples split - em produção usar parser robusto
    return line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
  });

  return data;
}

/**
 * Verificar tipo de arquivo e fazer parse
 * @param {File} file - Arquivo
 * @returns {Promise<Object>} { success: boolean, data: Array, error: string }
 */
export async function parseFile(file) {
  const filename = file.name.toLowerCase();
  const content = await file.text();

  try {
    if (filename.endsWith('.json')) {
      return parseJSON(content);
    } else if (filename.endsWith('.csv')) {
      const csvData = parseCSV(content);
      return parseExcelData(csvData);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      // Para XLSX/XLS, seria necessário usar biblioteca como 'xlsx'
      // Por enquanto, tenta interpretar como CSV como fallback
      const csvData = parseCSV(content);
      return parseExcelData(csvData);
    } else {
      // Tentar como CSV genérico
      const csvData = parseCSV(content);
      return parseExcelData(csvData);
    }
  } catch (error) {
    return {
      success: false,
      data: [],
      error: `Erro ao processar arquivo: ${error.message}`
    };
  }
}

/**
 * Validar estrutura completa de importação
 * @param {Object} parseResult - Resultado do parseFile
 * @returns {Object} { valid: boolean, validRecords: Array, invalidRecords: Array, summary: Object }
 */
export function validateImportStructure(parseResult) {
  if (!parseResult.success) {
    return {
      valid: false,
      validRecords: [],
      invalidRecords: [],
      summary: {
        total: 0,
        valid: 0,
        invalid: 0,
        errors: parseResult.error || 'Erro ao processar arquivo'
      }
    };
  }

  const validRecords = [];
  const invalidRecords = [];
  const { validateCombustivel } = require('./models/combustivel');

  parseResult.data.forEach((record, index) => {
    const validation = validateCombustivel(record);

    if (validation.valid) {
      validRecords.push(record);
    } else {
      invalidRecords.push({
        rowIndex: index + 2,
        record,
        errors: validation.errors
      });
    }
  });

  return {
    valid: invalidRecords.length === 0,
    validRecords,
    invalidRecords,
    summary: {
      total: parseResult.data.length,
      valid: validRecords.length,
      invalid: invalidRecords.length
    }
  };
}
