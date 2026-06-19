export async function DELETE(request) {
  try {
    const { createServiceClient } = await import('@/lib/supabase');
    const supabase = createServiceClient();

    // Deletar todos os registros da tabela veiculos
    const { error } = await supabase
      .from('veiculos')
      .delete()
      .neq('placa', null); // Deleta todos que têm placa (basicamente todos)

    if (error) {
      console.error('[Veículos Limpar] Erro:', error);
      return Response.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      message: 'Todos os veículos foram deletados'
    });
  } catch (error) {
    console.error('[Veículos Limpar] Erro geral:', error);
    return Response.json(
      { success: false, error: 'Erro ao limpar veículos: ' + error.message },
      { status: 500 }
    );
  }
}
