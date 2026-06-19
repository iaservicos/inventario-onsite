export async function POST(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    const body = await request.json();
    const { placa, tipo, descricao, valor, data_despesa } = body;

    if (!placa || !tipo || !valor) {
      return Response.json(
        { success: false, error: 'Campos obrigatórios: placa, tipo, valor' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('despesas')
      .insert({
        placa,
        tipo,
        descricao: descricao || '',
        valor: parseFloat(valor),
        data_despesa: data_despesa || new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[Despesa Criar] Erro:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('[Despesa Criar] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao criar despesa: ' + error.message },
      { status: 500 }
    );
  }
}
