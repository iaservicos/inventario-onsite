export async function GET(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('veiculos')
      .select('*')
      .order('placa', { ascending: true });

    if (error) {
      console.error('[Veículos List] Erro:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('[Veículos List] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao buscar veículos: ' + error.message },
      { status: 500 }
    );
  }
}
