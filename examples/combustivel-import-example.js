/**
 * Exemplos de Uso - Importação de Combustível
 *
 * Este arquivo demonstra como usar a API e componentes de importação
 */

// ====================
// 1. IMPORTAÇÃO VIA API - JSON
// ====================

async function importarPorJSON() {
  const dados = [
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
    },
    {
      data: '2026-06-19',
      placa: 'XYZ-5678',
      motorista: 'Maria Santos',
      uf: 'RJ',
      produto: 'Gasolina',
      litros: 40,
      kmL: 8.2,
      hodometro: 32000,
      vl_unit: 5.50,
      vl_total: 220.00,
      filial: 'RJ-02',
      uso: 'servico'
    }
  ];

  const response = await fetch('/api/frotas/combustivel/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: dados })
  });

  const resultado = await response.json();
  console.log('Importação JSON:', resultado);
}

// ====================
// 2. IMPORTAÇÃO VIA ARQUIVO
// ====================

async function importarPorArquivo(arquivo) {
  const formData = new FormData();
  formData.append('file', arquivo);

  const response = await fetch('/api/frotas/combustivel/import', {
    method: 'POST',
    body: formData
  });

  const resultado = await response.json();

  if (resultado.success) {
    console.log(`Importados: ${resultado.imported}/${resultado.total}`);
    if (resultado.failed > 0) {
      console.log('Erros:', resultado.details.errors);
    }
  } else {
    console.error('Erro na importação:', resultado.error);
    console.error('Detalhes:', resultado.details);
  }

  return resultado;
}

// ====================
// 3. USAR COMPONENTE IMPORTFORM
// ====================

// Em um componente React:
// import CombustvelImportForm from '@/app/(dashboard)/frotas/combustivel-import/ImportForm';
//
// export default function MinhaPage() {
//   return (
//     <div>
//       <h1>Importar Dados</h1>
//       <CombustvelImportForm />
//     </div>
//   );
// }

// ====================
// 4. PROCESSAR ARQUIVO ANTES DE ENVIAR
// ====================

import { parseExcelFile } from '@/lib/xlsx-helper';
import { parseExcelData, validateImportStructure } from '@/lib/xlsx-parser';

async function procesarArquivoComPreview(arquivo) {
  try {
    // 1. Parse do arquivo
    const excelData = await parseExcelFile(arquivo);
    console.log('Dados parseados:', excelData);

    // 2. Validar estrutura
    const parsed = parseExcelData(excelData);
    const validation = validateImportStructure(parsed);

    console.log('Validação:', {
      válidos: validation.validRecords.length,
      inválidos: validation.invalidRecords.length,
      erros: validation.invalidRecords
    });

    // 3. Se tudo OK, enviar para API
    if (validation.valid) {
      const formData = new FormData();
      formData.append('file', arquivo);

      const response = await fetch('/api/frotas/combustivel/import', {
        method: 'POST',
        body: formData
      });

      return await response.json();
    }

    return {
      success: false,
      error: 'Arquivo contém erros',
      details: validation.invalidRecords
    };
  } catch (error) {
    console.error('Erro ao processar:', error);
    return { success: false, error: error.message };
  }
}

// ====================
// 5. VALIDAÇÃO INDIVIDUAL
// ====================

import { validateCombustivel, normalizeCombustivel } from '@/lib/models/combustivel';

function validarRegistro(registro) {
  const validacao = validateCombustivel(registro);

  if (validacao.valid) {
    const normalizado = normalizeCombustivel(registro);
    console.log('Registro válido e normalizado:', normalizado);
  } else {
    console.log('Erros encontrados:', validacao.errors);
  }

  return validacao;
}

// ====================
// DADOS DE EXEMPLO - CSV
// ====================

const exemploCSV = `Data,Placa,Motorista,UF,Produto,Litros,Km/L,Hodômetro,Vl.Unit,Vl.Total,Filial
2026-06-19,ABC-1234,João Silva,SP,Diesel,50,5.5,45000,5.80,290.00,SP-01
2026-06-19,XYZ-5678,Maria Santos,RJ,Gasolina,40,8.2,32000,5.50,220.00,RJ-02
2026-06-20,DEF-9012,Pedro Costa,MG,Etanol,35,6.0,28000,3.80,133.00,MG-01
2026-06-20,GHI-3456,Ana Silva,SP,Diesel,45,5.2,52000,5.80,261.00,SP-02
2026-06-21,JKL-7890,Carlos Oliveira,SP,Gasolina,38,8.5,38000,5.50,209.00,SP-01`;

// ====================
// DADOS DE EXEMPLO - JSON
// ====================

const exemploJSON = [
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
  },
  {
    data: '2026-06-19',
    placa: 'XYZ-5678',
    motorista: 'Maria Santos',
    uf: 'RJ',
    produto: 'Gasolina',
    litros: 40,
    kmL: 8.2,
    hodometro: 32000,
    vl_unit: 5.50,
    vl_total: 220.00,
    filial: 'RJ-02',
    uso: 'servico'
  }
];

// ====================
// ERROS ESPERADOS NA VALIDAÇÃO
// ====================

const exemploErros = {
  // Placa inválida
  {
    data: '2026-06-19',
    placa: 'INVALIDO', // Erro: deve ser ABC-1234
    motorista: 'João',
    uf: 'SP',
    produto: 'Diesel',
    litros: 50,
    kmL: 5.5,
    hodometro: 45000,
    vl_unit: 5.80,
    vl_total: 290.00,
    filial: 'SP-01'
  },

  // Produto inválido
  {
    data: '2026-06-19',
    placa: 'ABC-1234',
    motorista: 'João',
    uf: 'SP',
    produto: 'Gasolina Premium', // Erro: deve ser um de Gasolina, Diesel, Etanol, Arla 32, GNV
    litros: 50,
    kmL: 5.5,
    hodometro: 45000,
    vl_unit: 5.80,
    vl_total: 290.00,
    filial: 'SP-01'
  },

  // UF inválida
  {
    data: '2026-06-19',
    placa: 'ABC-1234',
    motorista: 'João',
    uf: 'SPA', // Erro: deve ser exatamente 2 letras
    produto: 'Diesel',
    litros: 50,
    kmL: 5.5,
    hodometro: 45000,
    vl_unit: 5.80,
    vl_total: 290.00,
    filial: 'SP-01'
  },

  // Data inválida
  {
    data: '19/06/2026', // Erro: deve ser YYYY-MM-DD
    placa: 'ABC-1234',
    motorista: 'João',
    uf: 'SP',
    produto: 'Diesel',
    litros: 50,
    kmL: 5.5,
    hodometro: 45000,
    vl_unit: 5.80,
    vl_total: 290.00,
    filial: 'SP-01'
  }
};

// ====================
// RESPOSTAS DE EXEMPLO
// ====================

const respostaSucesso = {
  success: true,
  imported: 45,
  total: 50,
  failed: 5,
  message: "45 de 50 registros importados com sucesso",
  details: {
    summary: {
      total: 50,
      valid: 45,
      invalid: 5
    },
    errors: [
      {
        rowIndex: 12,
        placa: 'INV-1234',
        errors: ['Placa inválida: INV-1234 (formato esperado: ABC-1234)']
      },
      {
        rowIndex: 23,
        placa: 'ABC-5678',
        errors: ['Produto inválido: SuperGasolina']
      }
    ]
  }
};

const respostaErro = {
  success: false,
  error: "Nenhum registro válido encontrado",
  details: {
    summary: {
      total: 10,
      valid: 0,
      invalid: 10
    },
    errors: [
      {
        rowIndex: 2,
        placa: 'INVALIDO',
        errors: [
          'Placa inválida: INVALIDO (formato esperado: ABC-1234)',
          'UF inválida: XX (esperado: 2 letras)'
        ]
      }
    ]
  }
};

export {
  importarPorJSON,
  importarPorArquivo,
  procesarArquivoComPreview,
  validarRegistro,
  exemploCSV,
  exemploJSON,
  exemplosErros,
  respostaSucesso,
  respostaErro
};
