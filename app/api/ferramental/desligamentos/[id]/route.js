import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(_, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_desligamentos')
      .select('*, ferramental_devolucoes(*)')
      .eq('id', params.id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[DESLIGAMENTOS GET ID]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// Analista valida os itens devolvidos
export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Apenas analistas podem validar devoluções' }, { status: 403 });
    }

    const body = await req.json();
    const { validacoes } = body; // [{ devolucao_id, validated_quantity, destination_branch, divergence_notes }]

    if (!validacoes?.length) return NextResponse.json({ error: 'Nenhuma validação enviada' }, { status: 400 });

    const supabase = createServiceClient();
    let hasDivergence = false;

    for (const v of validacoes) {
      const { devolucao_id, validated_quantity, destination_branch, divergence_notes } = v;

      // Busca o item original
      const { data: item } = await supabase
        .from('ferramental_devolucoes')
        .select('returned_quantity, tool_id')
        .eq('id', devolucao_id)
        .single();

      const isDivergente = validated_quantity < (item?.returned_quantity ?? 0);
      if (isDivergente) hasDivergence = true;

      // Atualiza o item
      await supabase.from('ferramental_devolucoes').update({
        validated_quantity,
        destination_branch: destination_branch || null,
        divergence_notes:   isDivergente ? (divergence_notes || 'Quantidade validada menor que a devolvida') : null,
        status:             isDivergente ? 'divergencia' : 'validado',
      }).eq('id', devolucao_id);

      // Incrementa estoque central se validado e tem destino
      if (validated_quantity > 0 && destination_branch && item?.tool_id) {
        const { data: existing } = await supabase
          .from('ferramental_central_stock')
          .select('id, quantity')
          .eq('tool_id', item.tool_id)
          .eq('branch_name', destination_branch)
          .maybeSingle();

        if (existing) {
          await supabase.from('ferramental_central_stock').update({
            quantity:   existing.quantity + validated_quantity,
            updated_by: session.user.name,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await supabase.from('ferramental_central_stock').insert({
            tool_id:     item.tool_id,
            branch_name: destination_branch,
            quantity:    validated_quantity,
            updated_by:  session.user.name,
          });
        }
      }
    }

    // Atualiza status do desligamento
    const finalStatus = hasDivergence ? 'com_divergencia' : 'concluido';
    await supabase.from('ferramental_desligamentos').update({
      status:       finalStatus,
      validated_by: session.user.name,
      validated_at: new Date().toISOString(),
    }).eq('id', params.id);

    return NextResponse.json({ status: finalStatus });
  } catch (err) {
    console.error('[DESLIGAMENTOS PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
