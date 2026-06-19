/**
 * Debug API - Testa parsing de Excel
 * GET /api/frotas/combustivel/debug
 */

export async function GET(request) {
  try {
    // Tenta importar XLSX
    const XLSX = await import('xlsx');

    return Response.json({
      success: true,
      message: 'XLSX carregado com sucesso',
      version: XLSX.version,
      functions: Object.keys(XLSX).slice(0, 10)
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
