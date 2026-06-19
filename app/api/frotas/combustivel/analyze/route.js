/**
 * API de Análise - Mostra estrutura do Excel sem processar
 * POST /api/frotas/combustivel/analyze
 */

export async function POST(request) {
  try {
    console.log('[Analyze] Iniciando');

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json(
        { success: false, error: 'Nenhum arquivo enviado' },
        { status: 400 }
      );
    }

    console.log('[Analyze] Arquivo:', { name: file.name, size: file.size });

    // Ler arquivo como texto
    const text = await file.text();
    console.log('[Analyze] Tamanho do texto:', text.length);
    console.log('[Analyze] Primeiros 1000 caracteres:', text.substring(0, 1000));

    // Parse simples
    const lines = text.split('\n').map(line => line.trim()).filter(line => line);

    // Extrair headers (primeira linha)
    const headerLine = lines[0];
    let headers = headerLine.split(',').map(h => h.trim());
    if (headers.length === 1) {
      headers = headerLine.split(';').map(h => h.trim());
    }
    if (headers.length === 1) {
      headers = headerLine.split('\t').map(h => h.trim());
    }

    console.log('[Analyze] Headers encontrados:', headers);

    // Extrair primeiras 5 linhas de dados
    const sampleData = [];
    for (let i = 1; i < Math.min(6, lines.length); i++) {
      const line = lines[i];
      let values = line.split(',').map(v => v.trim());
      if (values.length === 1) {
        values = line.split(';').map(v => v.trim());
      }
      if (values.length === 1) {
        values = line.split('\t').map(v => v.trim());
      }

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      sampleData.push(row);
    }

    return Response.json({
      success: true,
      file: {
        name: file.name,
        size: file.size,
        type: file.type
      },
      structure: {
        separator: headerLine.includes(';') ? ';' : (headerLine.includes('\t') ? 'tab' : ','),
        totalHeaders: headers.length,
        headers: headers,
        totalDataLines: lines.length - 1
      },
      sampleData: sampleData
    });
  } catch (error) {
    console.error('[Analyze] Erro:', error);
    return Response.json(
      {
        success: false,
        error: error.message
      },
      { status: 500 }
    );
  }
}
