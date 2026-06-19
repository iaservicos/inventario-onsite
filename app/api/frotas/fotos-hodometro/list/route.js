export async function GET(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('fotos_hodometro')
      .select('*')
      .order('data_upload', { ascending: false });

    if (error) {
      console.error('[Fotos Hodometro List] Erro:', error);
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
    console.error('[Fotos Hodometro List] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao buscar fotos: ' + error.message },
      { status: 500 }
    );
  }
}
