/**
 * Helper para manipulação de arquivos Excel no cliente/servidor
 * Usa biblioteca 'xlsx'
 */

/**
 * Parsear arquivo Excel usando biblioteca xlsx
 * @param {File} file - Arquivo Excel
 * @returns {Promise<Array>} Array de arrays (linhas)
 */
export async function parseExcelFile(file) {
  const filename = file.name.toLowerCase();

  // Ler como array buffer
  const arrayBuffer = await file.arrayBuffer();

  // Para arquivos CSV e JSON, usar método alternativo
  if (filename.endsWith('.csv') || filename.endsWith('.json')) {
    const text = await file.text();

    if (filename.endsWith('.json')) {
      const json = JSON.parse(text);
      return Array.isArray(json) ? json : json.data || [];
    }

    // CSV parsing
    const delimiter = text.includes(';') ? ';' : ',';
    const lines = text.split('\n').filter(line => line.trim());
    return lines.map(line =>
      line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''))
    );
  }

  // Para XLSX/XLS, usar biblioteca xlsx (cliente) ou reader simples
  try {
    // Dinâmico import para cliente
    if (typeof window !== 'undefined') {
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      return data;
    }
  } catch (error) {
    console.warn('Erro ao usar xlsx library, tentando fallback:', error);
  }

  // Fallback para CSV simples (se arquivo é realmente XLSX mas tem estrutura simples)
  const text = await file.text();
  const delimiter = text.includes(';') ? ';' : ',';
  const lines = text.split('\n').filter(line => line.trim());
  return lines.map(line =>
    line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''))
  );
}

/**
 * Gerar arquivo Excel template
 * @param {string} filename - Nome do arquivo
 * @returns {void}
 */
export function downloadExcelTemplate(filename = 'template.csv') {
  const header = 'Data,Placa,Motorista,UF,Produto,Litros,Km/L,Hodômetro,Vl.Unit,Vl.Total,Filial\n';
  const exemplos = [
    '2026-06-19,ABC-1234,João Silva,SP,Diesel,50,5.5,45000,5.80,290.00,SP-01\n',
    '2026-06-19,XYZ-5678,Maria Santos,RJ,Gasolina,40,8.2,32000,5.50,220.00,RJ-02\n',
    '2026-06-20,DEF-9012,Pedro Costa,MG,Etanol,35,6.0,28000,3.80,133.00,MG-01'
  ];

  const csv = header + exemplos.join('');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}
