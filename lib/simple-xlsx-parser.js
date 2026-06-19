/**
 * Parser para Excel/CSV usando XLSX library
 */

import XLSX from 'xlsx';

/**
 * Ler arquivo Excel/CSV e retornar como JSON
 */
export async function parseExcelFile(file) {
  try {
    console.log('[parseExcelFile] Iniciando parse:', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    // Ler arquivo como ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Usar XLSX para ler
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Pegar primeira aba
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    console.log('[parseExcelFile] Sheet encontrada:', sheetName);

    // Converter para JSON - header:1 retorna array de arrays
    const data = XLSX.utils.sheet_to_json(worksheet, {
      header: 1, // Primeiro retorna como array de arrays
      blankrows: false
    });

    console.log('[parseExcelFile] Dados lidos:', { linhas: data.length, sheetName });

    if (!data || data.length < 2) {
      throw new Error('Arquivo vazio ou sem cabeçalho');
    }

    // Extrair headers (primeira linha)
    const headers = data[0];
    console.log('[parseExcelFile] Headers encontrados:', headers);

    // Converter resto em objetos
    const result = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];

      // Pular linhas vazias
      if (!row || row.every(cell => cell === null || cell === undefined || cell === '')) {
        continue;
      }

      const obj = {};
      headers.forEach((header, idx) => {
        obj[header] = row[idx];
      });

      result.push(obj);
      console.log(`[parseExcelFile] Linha ${i} parsed:`, {
        placa: obj.placa || obj.Placa,
        motorista: obj.motorista || obj.Motorista
      });
    }

    console.log('[parseExcelFile] Parse completo:', { total: result.length });

    return result;
  } catch (error) {
    console.error('[parseExcelFile] Erro:', error);
    throw new Error(`Erro ao ler arquivo: ${error.message}`);
  }
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
