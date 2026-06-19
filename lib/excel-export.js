import XLSX from 'xlsx';

/**
 * Exportar dados para Excel
 * Centraliza a lógica de exportação para garantir consistência
 */

/**
 * Gerar arquivo Excel e enviar como download
 * @param {Array} data - Array de objetos com dados
 * @param {string} sheetName - Nome da aba do Excel
 * @param {string} fileName - Nome do arquivo
 * @param {Array} columns - (opcional) Array de { header, key } para customizar colunas
 */
export function exportToExcel(data, sheetName = 'Dados', fileName = 'export.xlsx', columns = null) {
  try {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Dados vazios ou inválidos');
    }

    // Se columns não for especificado, usa as chaves do primeiro objeto
    let displayData = data;
    if (columns) {
      displayData = data.map(row => {
        const newRow = {};
        columns.forEach(col => {
          newRow[col.header] = row[col.key];
        });
        return newRow;
      });
    }

    // Criar workbook
    const worksheet = XLSX.utils.json_to_sheet(displayData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Auto-ajustar largura das colunas
    const colWidths = Object.keys(displayData[0] || {}).map(key => ({
      wch: Math.min(Math.max(key.length, 12), 30)
    }));
    worksheet['!cols'] = colWidths;

    // Estilo: cabeçalho em negrito
    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_col(col) + '1';
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: 'FFF2CC' } }
          };
        }
      }
    }

    // Salvar arquivo
    XLSX.writeFile(workbook, fileName);

    return { success: true, message: `${fileName} exportado com sucesso` };
  } catch (error) {
    console.error('[exportToExcel] Erro:', error);
    throw error;
  }
}

/**
 * Exportar múltiplas abas em um único Excel
 * @param {Array} sheets - Array de { name, data, columns }
 * @param {string} fileName - Nome do arquivo
 */
export function exportMultipleSheetsToExcel(sheets, fileName = 'export_multisheet.xlsx') {
  try {
    const workbook = XLSX.utils.book_new();

    sheets.forEach(({ name, data, columns }) => {
      if (!Array.isArray(data) || data.length === 0) {
        console.warn(`[exportMultipleSheetsToExcel] Sheet "${name}" vazia, pulando`);
        return;
      }

      let displayData = data;
      if (columns) {
        displayData = data.map(row => {
          const newRow = {};
          columns.forEach(col => {
            newRow[col.header] = row[col.key];
          });
          return newRow;
        });
      }

      const worksheet = XLSX.utils.json_to_sheet(displayData);

      // Auto-ajustar largura
      const colWidths = Object.keys(displayData[0] || {}).map(key => ({
        wch: Math.min(Math.max(key.length, 12), 30)
      }));
      worksheet['!cols'] = colWidths;

      // Estilo: cabeçalho
      if (worksheet['!ref']) {
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_col(col) + '1';
          if (worksheet[cellAddress]) {
            worksheet[cellAddress].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FFF2CC' } }
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    });

    XLSX.writeFile(workbook, fileName);

    return { success: true, message: `${fileName} exportado com sucesso` };
  } catch (error) {
    console.error('[exportMultipleSheetsToExcel] Erro:', error);
    throw error;
  }
}

/**
 * Exportar dados com formatação padrão
 * @param {Array} data - Dados para exportar
 * @param {Object} config - Configuração { title, sheetName, fileName, columns }
 */
export function exportData(data, config = {}) {
  const {
    title = 'Dados',
    sheetName = 'Sheet1',
    fileName = `${title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`,
    columns = null
  } = config;

  return exportToExcel(data, sheetName, fileName, columns);
}

/**
 * Template para exportação de combustíveis
 */
export function exportCombustiveis(combustiveis) {
  const columns = [
    { header: 'Data', key: 'data' },
    { header: 'Placa', key: 'placa' },
    { header: 'Motorista', key: 'motorista' },
    { header: 'UF', key: 'uf' },
    { header: 'Produto', key: 'produto' },
    { header: 'Litros', key: 'litros' },
    { header: 'Km/L', key: 'km_l' },
    { header: 'Hodômetro', key: 'hodometro' },
    { header: 'Vl. Unit.', key: 'vl_unit' },
    { header: 'Vl. Total', key: 'vl_total' },
    { header: 'Filial', key: 'filial' },
    { header: 'Uso', key: 'uso' }
  ];

  const fileName = `combustiveis_${new Date().toISOString().split('T')[0]}.xlsx`;
  return exportToExcel(combustiveis, 'Combustíveis', fileName, columns);
}

/**
 * Template para exportação de manutenções
 */
export function exportManutencoes(manutencoes) {
  const columns = [
    { header: 'Placa', key: 'placa' },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Data Realizada', key: 'data_realizada' },
    { header: 'Próxima Preventiva', key: 'proxima_preventiva' },
    { header: 'KM', key: 'km' },
    { header: 'Valor', key: 'valor' },
    { header: 'Status', key: 'status' },
    { header: 'Observações', key: 'observacoes' }
  ];

  const fileName = `manutencoes_${new Date().toISOString().split('T')[0]}.xlsx`;
  return exportToExcel(manutencoes, 'Manutenções', fileName, columns);
}

/**
 * Template para exportação de veículos
 */
export function exportVeiculos(veiculos) {
  const columns = [
    { header: 'Placa', key: 'placa' },
    { header: 'Modelo', key: 'modelo' },
    { header: 'Marca', key: 'marca' },
    { header: 'Ano', key: 'ano' },
    { header: 'KM Atual', key: 'km_atual' },
    { header: 'Status', key: 'status' },
    { header: 'Combustível', key: 'combustivel' },
    { header: 'Última Manutenção', key: 'ultima_manutencao' },
    { header: 'Próxima Manutenção', key: 'proxima_manutencao' },
    { header: 'Observações', key: 'observacoes' }
  ];

  const fileName = `veiculos_${new Date().toISOString().split('T')[0]}.xlsx`;
  return exportToExcel(veiculos, 'Veículos', fileName, columns);
}

/**
 * Template para exportação de relatório consolidado
 */
export function exportRelatorioConsolidado({ veiculos, combustiveis, manutencoes }) {
  const sheets = [];

  if (veiculos && veiculos.length > 0) {
    sheets.push({
      name: 'Veículos',
      data: veiculos,
      columns: [
        { header: 'Placa', key: 'placa' },
        { header: 'Modelo', key: 'modelo' },
        { header: 'Marca', key: 'marca' },
        { header: 'Ano', key: 'ano' },
        { header: 'KM Atual', key: 'km_atual' },
        { header: 'Status', key: 'status' }
      ]
    });
  }

  if (combustiveis && combustiveis.length > 0) {
    sheets.push({
      name: 'Combustíveis',
      data: combustiveis,
      columns: [
        { header: 'Data', key: 'data' },
        { header: 'Placa', key: 'placa' },
        { header: 'Litros', key: 'litros' },
        { header: 'Vl. Total', key: 'vl_total' }
      ]
    });
  }

  if (manutencoes && manutencoes.length > 0) {
    sheets.push({
      name: 'Manutenções',
      data: manutencoes,
      columns: [
        { header: 'Placa', key: 'placa' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Data', key: 'data_realizada' },
        { header: 'Valor', key: 'valor' }
      ]
    });
  }

  const fileName = `relatorio_frotas_${new Date().toISOString().split('T')[0]}.xlsx`;
  return exportMultipleSheetsToExcel(sheets, fileName);
}
