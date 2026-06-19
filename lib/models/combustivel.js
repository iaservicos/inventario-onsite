/**
 * Modelo de Combustível
 * Estrutura de dados para abastecimentos/consumo de combustível
 */

const schema = {
  id: { type: 'string', required: false },
  data: { type: 'date', required: true },
  placa: { type: 'string', required: true, pattern: /^[A-Z]{3}-\d{4}$/i },
  motorista: { type: 'string', required: true, minLength: 3 },
  uf: { type: 'string', required: true, pattern: /^[A-Z]{2}$/ },
  produto: { type: 'string', required: true, enum: ['Gasolina', 'Diesel', 'Etanol', 'Arla 32', 'GNV'] },
  litros: { type: 'number', required: true, min: 0.1 },
  kmL: { type: 'number', required: true, min: 0.1 },
  hodometro: { type: 'number', required: true, min: 0 },
  vl_unit: { type: 'number', required: true, min: 0 },
  vl_total: { type: 'number', required: true, min: 0 },
  filial: { type: 'string', required: true, minLength: 2 },
  uso: { type: 'string', required: true, enum: ['servico', 'particular'] },
  createdAt: { type: 'date', required: false },
  updatedAt: { type: 'date', required: false }
};

/**
 * Validar estrutura de um registro de combustível
 * @param {Object} record - Registro a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateCombustivel(record) {
  const errors = [];

  if (!record.data || isNaN(new Date(record.data).getTime())) {
    errors.push('Data inválida ou ausente');
  }

  if (!record.placa || !/^[A-Z]{3}-\d{4}$/i.test(record.placa)) {
    errors.push(`Placa inválida: ${record.placa} (formato esperado: ABC-1234)`);
  }

  if (!record.motorista || record.motorista.toString().trim().length < 3) {
    errors.push('Motorista inválido ou ausente');
  }

  if (!record.uf || !/^[A-Z]{2}$/.test(record.uf.trim().toUpperCase())) {
    errors.push(`UF inválida: ${record.uf} (esperado: 2 letras)`);
  }

  if (!record.produto || !schema.produto.enum.includes(record.produto)) {
    errors.push(`Produto inválido: ${record.produto}`);
  }

  const litros = parseFloat(record.litros);
  if (isNaN(litros) || litros < 0.1) {
    errors.push(`Litros inválidos: ${record.litros} (mínimo: 0.1)`);
  }

  const kmL = parseFloat(record.kmL);
  if (isNaN(kmL) || kmL < 0.1) {
    errors.push(`Km/L inválido: ${record.kmL} (mínimo: 0.1)`);
  }

  const hodometro = parseInt(record.hodometro);
  if (isNaN(hodometro) || hodometro < 0) {
    errors.push(`Hodômetro inválido: ${record.hodometro}`);
  }

  const vl_unit = parseFloat(record.vl_unit);
  if (isNaN(vl_unit) || vl_unit < 0) {
    errors.push(`Valor unitário inválido: ${record.vl_unit}`);
  }

  const vl_total = parseFloat(record.vl_total);
  if (isNaN(vl_total) || vl_total < 0) {
    errors.push(`Valor total inválido: ${record.vl_total}`);
  }

  if (!record.filial || record.filial.toString().trim().length < 2) {
    errors.push('Filial inválida ou ausente');
  }

  if (!record.uso || !schema.uso.enum.includes(record.uso.toLowerCase())) {
    errors.push(`Uso inválido: ${record.uso} (esperado: servico ou particular)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalizar/sanitizar um registro de combustível
 * @param {Object} record - Registro a normalizar
 * @returns {Object} Registro normalizado
 */
export function normalizeCombustivel(record) {
  return {
    id: record.id || `comb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    data: new Date(record.data).toISOString().split('T')[0],
    placa: record.placa.toUpperCase().trim(),
    motorista: record.motorista.trim(),
    uf: record.uf.toUpperCase().trim(),
    produto: record.produto.trim(),
    litros: parseFloat(record.litros),
    kmL: parseFloat(record.kmL),
    hodometro: parseInt(record.hodometro),
    vl_unit: parseFloat(record.vl_unit),
    vl_total: parseFloat(record.vl_total),
    filial: record.filial.trim(),
    uso: record.uso.toLowerCase().trim(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Mock database - substitua por integração real com banco de dados
 */
let mockDatabase = [];

/**
 * Salvar registros de combustível (mock)
 * @param {Array} records - Array de registros normalizados
 * @returns {Object} { success: boolean, saved: number, errors: object[] }
 */
export async function saveCombustivelBatch(records) {
  try {
    const errors = [];
    let saved = 0;

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const validation = validateCombustivel(record);

      if (!validation.valid) {
        errors.push({
          rowIndex: i + 2, // +2 para considerar header
          placa: record.placa,
          errors: validation.errors
        });
        continue;
      }

      const normalized = normalizeCombustivel(record);
      mockDatabase.push(normalized);
      saved++;
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

/**
 * Obter todos os registros de combustível (mock)
 * @returns {Array}
 */
export function getCombustivelAll() {
  return mockDatabase;
}

/**
 * Obter registros por filtro (mock)
 * @param {Object} filters - Filtros
 * @returns {Array}
 */
export function getCombustivelFiltered(filters = {}) {
  let result = mockDatabase;

  if (filters.placa) {
    result = result.filter(c => c.placa.includes(filters.placa.toUpperCase()));
  }

  if (filters.motorista) {
    result = result.filter(c => c.motorista.toUpperCase().includes(filters.motorista.toUpperCase()));
  }

  if (filters.uf) {
    result = result.filter(c => c.uf === filters.uf);
  }

  if (filters.produto) {
    result = result.filter(c => c.produto === filters.produto);
  }

  if (filters.uso) {
    result = result.filter(c => c.uso === filters.uso);
  }

  if (filters.dataInicio && filters.dataFim) {
    const inicio = new Date(filters.dataInicio);
    const fim = new Date(filters.dataFim);
    result = result.filter(c => {
      const data = new Date(c.data);
      return data >= inicio && data <= fim;
    });
  }

  return result;
}

export const schema_definition = schema;
