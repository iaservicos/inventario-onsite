export async function POST(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    const body = await request.json();
    const { placa, modelo, marca, ano, status, combustivel, observacoes } = body;

    if (!placa) {
      return Response.json(
        { success: false, error: 'Placa é obrigatória' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('veiculos')
      .insert({
        placa: placa.toUpperCase().trim(),
        modelo: modelo || null,
        marca: marca || null,
        ano: ano ? parseInt(ano) : null,
        status: status || 'ativo',
        combustivel: combustivel || null,
        observacoes: observacoes || null,
        km_atual: 0
      })
      .select()
      .single();

    if (error) {
      console.error('[Veículo Criar] Erro:', error);
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
    console.error('[Veículo Criar] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao criar veículo: ' + error.message },
      { status: 500 }
    );
  }
}
