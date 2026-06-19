export async function GET(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('combustiveis')
      .select('quantidade, valor_total, consumo, distancia');

    if (error) {
      console.error('[Combustivel Stats] Erro:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const items = data || [];
    const total = items.length;
    const totalGasto = items.reduce((sum, item) => sum + (parseFloat(item.valor_total) || 0), 0);
    const consumoMedio = total > 0 ? items.reduce((sum, item) => sum + (parseFloat(item.consumo) || 0), 0) / total : 0;
    const distanciaMedia = total > 0 ? items.reduce((sum, item) => sum + (parseInt(item.distancia) || 0), 0) / total : 0;

    return Response.json({
      success: true,
      data: {
        total,
        totalGasto,
        consumoMedio,
        distanciaMedia
      }
    });
  } catch (error) {
    console.error('[Combustivel Stats] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao calcular estatísticas: ' + error.message },
      { status: 500 }
    );
  }
}
