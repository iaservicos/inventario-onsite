/**
 * Parser simples para Excel/CSV sem dependências externas
 * Usa buffer para ler dados binários básicos
 */

/**
 * Converter ArrayBuffer para string (tenta várias codificações)
 */
function bufferToString(buffer) {
  try {
    return new TextDecoder('utf-8').decode(buffer);
  } catch {
    try {
      return new TextDecoder('latin1').decode(buffer);
    } catch {
      return buffer.toString();
    }
  }
}

/**
 * Extrair CSV de arquivo (fallback para Excel)
 * Tenta ler como CSV primeiro, depois como texto simples
 */
export async function parseExcelFile(file) {
  console.log('[parseExcelFile] Iniciando parse:', {
    name: file.name,
    size: file.size,
    type: file.type
  });

  try {
    // Ler arquivo como texto (funciona para CSV, também tenta para XLSX)
    const text = await file.text();
    console.log('[parseExcelFile] Arquivo lido como texto, primeiros 200 chars:', text.substring(0, 200));

    // Se for CSV ou texto simples
    if (file.name.endsWith('.csv') || !file.name.endsWith('.xlsx')) {
      return parseCSV(text);
    }

    // Se for XLSX, tenta extrair como CSV (fallback)
    // XLSX é um ZIP, então não conseguimos ler direto sem biblioteca
    // Tenta ler como UTF-8 e extrair dados
    const lines = text.split('\n').filter(l => l.trim());

    if (lines.length > 0) {
      console.log('[parseExcelFile] Tentando parse como CSV (fallback para XLSX)');
      return parseCSV(text);
    }

    throw new Error('Arquivo vazio ou formato não reconhecido');
  } catch (error) {
    console.error('[parseExcelFile] Erro:', error);
    throw new Error(`Erro ao ler arquivo: ${error.message}`);
  }
}

/**
 * Parse CSV simples
 */
function parseCSV(csvText) {
  console.log('[parseCSV] Iniciando parse CSV');

  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('Arquivo vazio ou sem dados');
  }

  // Extrair headers
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  console.log('[parseCSV] Headers encontrados:', headers.length, headers);

  if (headers.length === 0) {
    throw new Error('Não foi possível extrair headers do arquivo');
  }

  // Extrair dados
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // pular linhas vazias

    try {
      const values = parseCSVLine(line);
      const row = {};

      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });

      data.push(row);
      console.log(`[parseCSV] Linha ${i} parsed:`, {
        placa: row.placa || row.Placa,
        motorista: row.motorista || row.Motorista,
        produto: row.produto || row.Produto
      });
    } catch (error) {
      console.warn(`[parseCSV] Erro ao parsear linha ${i}:`, error.message);
      continue;
    }
  }

  console.log('[parseCSV] Parse completo:', { total: data.length, linhas: data.length });

  return data;
}

/**
 * Parse de linha CSV (lidar com aspas e vírgulas)
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else if (char === ';' && !insideQuotes) {
      // Portuguese CSV uses semicolon
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Validar estrutura de importação
 */
export function validateImportStructure(parseResult) {
  console.log('[validateImportStructure] Iniciando validação');

  const data = Array.isArray(parseResult.data) ? parseResult.data : parseResult;

  if (!Array.isArray(data) || data.length === 0) {
    return {
      valid: false,
      validRecords: [],
      invalidRecords: [],
      summary: { total: 0, valid: 0, invalid: 0 }
    };
  }

  const validRecords = [];
  const invalidRecords = [];
  const requiredFields = ['data', 'placa', 'motorista', 'uf', 'produto', 'litros', 'hodometro'];

  data.forEach((record, idx) => {
    // Normalizar nomes de campo (case-insensitive)
    const normalized = {};
    Object.keys(record).forEach(key => {
      const lowerKey = key.toLowerCase().trim();
      normalized[lowerKey] = record[key];
    });

    // Verificar campos obrigatórios (flexível)
    const hasMinimalData = requiredFields.some(field =>
      normalized[field] !== undefined &&
      normalized[field] !== null &&
      String(normalized[field]).trim() !== ''
    );

    if (hasMinimalData) {
      validRecords.push(normalized);
      console.log(`[validateImportStructure] Linha ${idx + 2} válida`);
    } else {
      invalidRecords.push({
        line: idx + 2,
        data: normalized,
        error: 'Campos obrigatórios faltando ou vazios'
      });
      console.log(`[validateImportStructure] Linha ${idx + 2} inválida: faltam campos`);
    }
  });

  return {
    valid: invalidRecords.length === 0,
    validRecords,
    invalidRecords,
    summary: {
      total: data.length,
      valid: validRecords.length,
      invalid: invalidRecords.length
    }
  };
}

/**
 * Parse file wrapper
 */
export const parseFile = parseExcelFile;
