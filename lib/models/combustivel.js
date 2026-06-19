/**
 * Modelo de Combustível
 * Estrutura de dados para abastecimentos/consumo de combustível
 */

// Produtos válidos - aceita variações de caso
const VALID_PRODUCTS = ['Gasolina', 'Diesel', 'Etanol', 'Arla 32', 'GNV'];
const VALID_PRODUCTS_NORMALIZED = VALID_PRODUCTS.map(p => p.toUpperCase());

// Usos válidos
const VALID_USES = ['servico', 'particular'];

// Debug logging
let debugMode = true;

function log(message, data = null) {
  if (debugMode) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ${message}`, data);
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

const schema = {
  id: { type: 'string', required: false },
  data: { type: 'date', required: true },
  placa: { type: 'string', required: true },
  motorista: { type: 'string', required: true },
  uf: { type: 'string', required: true },
  produto: { type: 'string', required: true },
  litros: { type: 'number', required: true, min: 0.1 },
  kmL: { type: 'number', required: true, min: 0.1 },
  hodometro: { type: 'number', required: true, min: 0 },
  vl_unit: { type: 'number', required: true, min: 0 },
  vl_total: { type: 'number', required: true, min: 0 },
  filial: { type: 'string', required: true },
  uso: { type: 'string', required: true },
  createdAt: { type: 'date', required: false },
  updatedAt: { type: 'date', required: false }
};

/**
 * Normalizar placa para formato ABC-1234
 * Aceita: ABC-1234, ABC1234, abc-1234, abc1234, ABC 1234, etc
 */
function normalizePlaca(placa) {
  if (!placa) return null;

  // Remove espaços e normaliza
  let normalized = placa.toString().toUpperCase().replace(/\s+/g, '').trim();

  // Remove hífen existente
  normalized = normalized.replace(/-/g, '');

  // Verifica se tem 7 caracteres (3 letras + 4 números)
  if (normalized.length === 7) {
    const match = normalized.match(/^([A-Z]{3})(\d{4})$/);
    if (match) {
      return `${match[1]}-${match[2]}`;
    }
  }

  log(`[normalizePlaca] Formato não reconhecido: "${placa}" -> "${normalized}"`);
  return normalized; // Retorna mesmo se não bater o padrão esperado
}

/**
 * Normalizar produto
 * Aceita: gasolina, Gasolina, GASOLINA, diesel, DIESEL, etc
 */
function normalizeProduto(produto) {
  if (!produto) return null;

  let normalized = produto.toString().trim().toUpperCase();

  // Tenta encontrar correspondência
  for (let validProduct of VALID_PRODUCTS) {
    if (normalized === validProduct.toUpperCase()) {
      return validProduct; // Retorna formato original capitalizado
    }
  }

  // Se não encontrar, retorna com primeira letra maiúscula
  return produto.toString().trim().charAt(0).toUpperCase() + produto.toString().trim().slice(1).toLowerCase();
}

/**
 * Normalizar UF
 * Aceita: sp, SP, Sp, etc -> SP
 */
function normalizeUF(uf) {
  if (!uf) return null;

  const normalized = uf.toString().trim().toUpperCase();

  // Valida se tem 2 caracteres
  if (normalized.length === 2 && /^[A-Z]{2}$/.test(normalized)) {
    return normalized;
  }

  log(`[normalizeUF] UF inválida: "${uf}" -> "${normalized}"`);
  return normalized;
}

/**
 * Normalizar uso
 * Aceita: servico, Servico, SERVICO, particular, Particular, PARTICULAR
 */
function normalizeUso(uso) {
  if (!uso) return null;

  const normalized = uso.toString().trim().toLowerCase();

  // Valida se está na lista válida
  if (VALID_USES.includes(normalized)) {
    return normalized;
  }

  log(`[normalizeUso] Uso não reconhecido: "${uso}" -> "${normalized}"`);
  return normalized;
}

/**
 * Validar estrutura de um registro de combustível
 * Validações FLEXÍVEIS para aceitar dados de diferentes formatos
 * @param {Object} record - Registro a validar
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateCombustivel(record) {
  const errors = [];

  // Data - tenta converter
  if (!record.data) {
    errors.push('Data ausente');
  } else {
    const dataObj = new Date(record.data);
    if (isNaN(dataObj.getTime())) {
      log(`[validateCombustivel] Data inválida: "${record.data}"`);
      errors.push(`Data inválida: ${record.data}`);
    }
  }

  // Placa - flexível
  if (!record.placa) {
    errors.push('Placa ausente');
  } else {
    const normalized = normalizePlaca(record.placa);
    if (!normalized) {
      log(`[validateCombustivel] Placa não pôde ser normalizada: "${record.placa}"`);
      errors.push(`Placa não pôde ser normalizada: ${record.placa}`);
    }
  }

  // Motorista - apenas verifica se não está vazio
  if (!record.motorista || record.motorista.toString().trim().length === 0) {
    errors.push('Motorista ausente');
  }

  // UF - flexível
  if (!record.uf) {
    errors.push('UF ausente');
  } else {
    const normalized = normalizeUF(record.uf);
    if (!normalized || normalized.length !== 2) {
      log(`[validateCombustivel] UF inválida: "${record.uf}"`);
      errors.push(`UF deve ter 2 letras: ${record.uf}`);
    }
  }

  // Produto - flexível, aceita variações
  if (!record.produto) {
    errors.push('Produto ausente');
  } else {
    // Apenas verifica se consegue normalizar, não rejeita
    const normalized = normalizeProduto(record.produto);
    if (!normalized) {
      log(`[validateCombustivel] Produto não pôde ser normalizado: "${record.produto}"`);
      errors.push(`Produto não pôde ser normalizado: ${record.produto}`);
    }
  }

  // Litros - converte automaticamente
  if (!record.litros && record.litros !== 0) {
    errors.push('Litros ausente');
  } else {
    const litros = parseFloat(record.litros);
    if (isNaN(litros)) {
      log(`[validateCombustivel] Litros não numérico: "${record.litros}"`);
      errors.push(`Litros não é número: ${record.litros}`);
    } else if (litros < 0.1) {
      log(`[validateCombustivel] Litros abaixo do mínimo: ${litros}`);
      errors.push(`Litros deve ser >= 0.1: ${litros}`);
    }
  }

  // Km/L - converte automaticamente
  if (!record.kmL && record.kmL !== 0) {
    errors.push('Km/L ausente');
  } else {
    const kmL = parseFloat(record.kmL);
    if (isNaN(kmL)) {
      log(`[validateCombustivel] Km/L não numérico: "${record.kmL}"`);
      errors.push(`Km/L não é número: ${record.kmL}`);
    } else if (kmL < 0.1) {
      log(`[validateCombustivel] Km/L abaixo do mínimo: ${kmL}`);
      errors.push(`Km/L deve ser >= 0.1: ${kmL}`);
    }
  }

  // Hodômetro - converte automaticamente
  if (!record.hodometro && record.hodometro !== 0) {
    errors.push('Hodômetro ausente');
  } else {
    const hodometro = parseInt(record.hodometro);
    if (isNaN(hodometro)) {
      log(`[validateCombustivel] Hodômetro não numérico: "${record.hodometro}"`);
      errors.push(`Hodômetro não é número: ${record.hodometro}`);
    } else if (hodometro < 0) {
      log(`[validateCombustivel] Hodômetro negativo: ${hodometro}`);
      errors.push(`Hodômetro não pode ser negativo: ${hodometro}`);
    }
  }

  // Valor unitário - converte automaticamente
  if (!record.vl_unit && record.vl_unit !== 0) {
    errors.push('Valor unitário ausente');
  } else {
    const vl_unit = parseFloat(record.vl_unit);
    if (isNaN(vl_unit)) {
      log(`[validateCombustivel] Valor unitário não numérico: "${record.vl_unit}"`);
      errors.push(`Valor unitário não é número: ${record.vl_unit}`);
    } else if (vl_unit < 0) {
      log(`[validateCombustivel] Valor unitário negativo: ${vl_unit}`);
      errors.push(`Valor unitário não pode ser negativo: ${vl_unit}`);
    }
  }

  // Valor total - converte automaticamente
  if (!record.vl_total && record.vl_total !== 0) {
    errors.push('Valor total ausente');
  } else {
    const vl_total = parseFloat(record.vl_total);
    if (isNaN(vl_total)) {
      log(`[validateCombustivel] Valor total não numérico: "${record.vl_total}"`);
      errors.push(`Valor total não é número: ${record.vl_total}`);
    } else if (vl_total < 0) {
      log(`[validateCombustivel] Valor total negativo: ${vl_total}`);
      errors.push(`Valor total não pode ser negativo: ${vl_total}`);
    }
  }

  // Filial - apenas verifica se não está vazio
  if (!record.filial || record.filial.toString().trim().length === 0) {
    errors.push('Filial ausente');
  }

  // Uso - flexível, aceita variações
  if (!record.uso) {
    errors.push('Uso ausente');
  } else {
    const normalized = normalizeUso(record.uso);
    if (!normalized || !VALID_USES.includes(normalized)) {
      log(`[validateCombustivel] Uso inválido: "${record.uso}" -> "${normalized}"`);
      errors.push(`Uso deve ser 'servico' ou 'particular': ${record.uso}`);
    }
  }

  if (errors.length > 0) {
    log(`[validateCombustivel] Registro com erros:`, {
      placa: record.placa,
      errosCount: errors.length,
      errors
    });
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Normalizar/sanitizar um registro de combustível
 * Aplica todas as transformações de formato
 * @param {Object} record - Registro a normalizar
 * @returns {Object} Registro normalizado
 */
export function normalizeCombustivel(record) {
  const normalized = {
    id: record.id || `comb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    data: new Date(record.data).toISOString().split('T')[0],
    placa: normalizePlaca(record.placa),
    motorista: record.motorista ? record.motorista.toString().trim() : '',
    uf: normalizeUF(record.uf),
    produto: normalizeProduto(record.produto),
    litros: parseFloat(record.litros),
    kmL: parseFloat(record.kmL),
    hodometro: parseInt(record.hodometro),
    vl_unit: parseFloat(record.vl_unit),
    vl_total: parseFloat(record.vl_total),
    filial: record.filial ? record.filial.toString().trim() : '',
    uso: normalizeUso(record.uso),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  log(`[normalizeCombustivel] Registro normalizado:`, {
    placa: normalized.placa,
    produto: normalized.produto,
    uf: normalized.uf,
    uso: normalized.uso
  });

  return normalized;
}

/**
 * Salvar registros de combustível no Supabase
 * @param {Array} records - Array de registros para processar
 * @returns {Object} { success: boolean, saved: number, total: number, errors: object[] }
 */
export async function saveCombustivelBatch(records) {
  try {
    const errors = [];
    let saved = 0;

    log(`[saveCombustivelBatch] Iniciando importação de ${records.length} registros`);

    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      log(`[saveCombustivelBatch] Processando linha ${i + 2}:`, {
        placa: record.placa,
        motorista: record.motorista,
        produto: record.produto,
        litros: record.litros
      });

      const validation = validateCombustivel(record);

      if (!validation.valid) {
        log(`[saveCombustivelBatch] Linha ${i + 2} rejeitada por validação`, {
          placa: record.placa,
          erros: validation.errors
        });

        errors.push({
          rowIndex: i + 2, // +2 para considerar header
          placa: record.placa || 'N/A',
          errors: validation.errors
        });
        continue;
      }

      try {
        const normalized = normalizeCombustivel(record);

        // Tentar salvar no Supabase
        try {
          const { createServiceClient } = await import('@/lib/supabase');
          const supabase = createServiceClient();

          const { data, error } = await supabase
            .from('combustiveis')
            .insert({
              data: normalized.data,
              placa: normalized.placa,
              motorista: normalized.motorista,
              uf: normalized.uf,
              produto: normalized.produto,
              litros: normalized.litros,
              km_l: normalized.kmL,
              hodometro: normalized.hodometro,
              vl_unit: normalized.vl_unit,
              vl_total: normalized.vl_total,
              filial: normalized.filial,
              uso: normalized.uso
            })
            .select()
            .single();

          if (error) {
            throw error;
          }

          saved++;
          log(`[saveCombustivelBatch] Linha ${i + 2} importada com sucesso no Supabase`, {
            placa: normalized.placa,
            produto: normalized.produto,
            id: data?.id
          });
        } catch (dbError) {
          log(`[saveCombustivelBatch] Erro ao salvar no Supabase:`, dbError.message);
          // Continuar com próximo registro mesmo se Supabase falhar
          errors.push({
            rowIndex: i + 2,
            placa: record.placa || 'N/A',
            errors: [`Erro ao salvar no banco: ${dbError.message}`]
          });
        }
      } catch (normError) {
        log(`[saveCombustivelBatch] Erro ao normalizar linha ${i + 2}:`, normError.message);
        errors.push({
          rowIndex: i + 2,
          placa: record.placa || 'N/A',
          errors: [normError.message]
        });
      }
    }

    log(`[saveCombustivelBatch] Importação finalizada`, {
      total: records.length,
      salvos: saved,
      erros: errors.length,
      sucesso: errors.length === 0
    });

    return {
      success: errors.length === 0,
      saved,
      total: records.length,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    log(`[saveCombustivelBatch] Erro crítico na importação:`, error.message);
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

/**
 * Ativar/desativar modo debug
 * @param {boolean} enabled
 */
export function setDebugMode(enabled) {
  debugMode = enabled;
  log(`Debug mode: ${enabled ? 'ATIVADO' : 'DESATIVADO'}`);
}

/**
 * Obter funções de normalização para uso externo
 */
export const normalizationFunctions = {
  placa: normalizePlaca,
  produto: normalizeProduto,
  uf: normalizeUF,
  uso: normalizeUso
};

/**
 * Obter constantes de validação
 */
export const validationConstants = {
  VALID_PRODUCTS,
  VALID_PRODUCTS_NORMALIZED,
  VALID_USES
};

export const schema_definition = schema;
