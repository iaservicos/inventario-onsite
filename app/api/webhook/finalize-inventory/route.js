import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { inventory_id, nome } = body;

    const supabase = createServiceClient();

    // 1. Localizar o inventário (por ID ou nome do técnico)
    let inventory;

    if (inventory_id) {
      const { data, error } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, status, technicians(id, name, phone)')
        .eq('id', parseInt(inventory_id))
        .single();
      if (error || !data) return NextResponse.json({ error: 'Inventário não encontrado' }, { status: 404 });
      inventory = data;
    } else if (nome) {
      const { data: tech } = await supabase
        .from('technicians')
        .select('id, name, phone')
        .ilike('name', nome)
        .single();
      if (!tech) return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });

      const { data, error } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, status, technicians(id, name, phone)')
        .eq('technician_id', tech.id)
        .in('status', ['in_progress', 'pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Inventário ativo não encontrado' }, { status: 404 });
      inventory = data;
    } else {
      return NextResponse.json({ error: 'Informe inventory_id ou nome' }, { status: 400 });
    }

    const { id: invId, technician_id: techId } = inventory;

    // 2. Buscar TODOS os itens do inventário de uma vez
    const { data: allItems } = await supabase
      .from('inventory_items')
      .select('id, item_code, item_name, physical_qty, system_qty, counted_at')
      .eq('inventory_id', invId);

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado neste inventário' }, { status: 400 });
    }

    // Separa linhas contadas das linhas originais do dispatch
    const countedItems = allItems.filter(i => i.physical_qty !== null);

    if (countedItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item foi contado ainda' }, { status: 400 });
    }

    // Monta mapa do system_qty a partir das linhas originais do dispatch
    // (physical_qty = null = linha criada pelo dispatch, tem o system_qty correto)
    const dispatchSysQtyMap = {};
    for (const item of allItems.filter(i => i.physical_qty === null)) {
      dispatchSysQtyMap[item.item_code] = Number(item.system_qty) || 0;
    }

    // Fallback: technician_items para itens sem linha de dispatch correspondente
    const missingCodes = countedItems
      .filter(i => dispatchSysQtyMap[i.item_code] === undefined)
      .map(i => i.item_code);

    const sysQtyFallback = {};
    if (missingCodes.length > 0) {
      const { data: techItems } = await supabase
        .from('technician_items')
        .select('item_code, item_quantity')
        .eq('technician_id', techId)
        .eq('active', true);
      for (const ti of (techItems || [])) {
        sysQtyFallback[ti.item_code] = (sysQtyFallback[ti.item_code] || 0) + (Number(ti.item_quantity) || 0);
      }
    }

    // 4. Comparar cada item contado com o sistema
    const divergencesToInsert = [];
    const recountItems   = [];
    const surplusItems   = [];

    for (const item of countedItems) {
      // Usa system_qty da linha original do dispatch quando disponível.
      // Fallback para technician_items se o item foi inserido direto pelo PA (sem linha de dispatch).
      const sysQty = dispatchSysQtyMap[item.item_code] !== undefined
        ? dispatchSysQtyMap[item.item_code]
        : (sysQtyFallback[item.item_code] || 0);
      const physQty = Number(item.physical_qty);
      const diff    = physQty - sysQty;
      const hasDiv  = diff !== 0;
      const pct     = sysQty > 0
        ? parseFloat(Math.abs((diff / sysQty) * 100).toFixed(2))
        : physQty > 0 ? 100 : 0;

      // Atualiza o item com o system_qty real e o resultado da contagem
      await supabase
        .from('inventory_items')
        .update({
          system_qty:     sysQty,
          has_divergence: hasDiv,
          status:         !hasDiv ? 'counted' : diff < 0 ? 'recount' : 'counted',
          counted_at:     item.counted_at || new Date().toISOString(),
        })
        .eq('id', item.id);

      if (hasDiv) {
        divergencesToInsert.push({
          inventory_id:    invId,
          technician_id:   techId,
          item_code:       item.item_code,
          item_name:       item.item_name,
          system_qty:      sysQty,
          physical_qty:    physQty,
          difference:      diff,
          percentage_diff: pct,
          status:          'open',
        });

        if (diff < 0) {
          recountItems.push({ code: item.item_code, name: item.item_name, system_qty: sysQty, physical_qty: physQty, diff });
        } else {
          surplusItems.push({ code: item.item_code, name: item.item_name, system_qty: sysQty, physical_qty: physQty, diff });
        }
      }
    }

    // 5. Gravar divergências
    if (divergencesToInsert.length > 0) {
      await supabase.from('divergences').insert(divergencesToInsert);
    }

    // 6. Atualizar status do inventário
    const newStatus = recountItems.length > 0 ? 'recount_pending' : 'completed';
    await supabase
      .from('inventories')
      .update({
        status:          newStatus,
        completed_at:    new Date().toISOString(),
        total_items:     countedItems.length,
        counted_items:   countedItems.length,
        divergence_count: divergencesToInsert.length,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', invId);

    // 7. Criar alerta para supervisor quando há excesso
    if (surplusItems.length > 0) {
      const techName = inventory.technicians?.name || 'Técnico';
      await supabase.from('alerts').insert({
        type:          'surplus',
        severity:      'medium',
        title:         `Excesso de peças — ${techName}`,
        description:   `${surplusItems.length} peça(s) com quantidade ACIMA do sistema: ${surplusItems.map(i => `${i.code} (+${i.diff})`).join(', ')}. Verificação necessária.`,
        technician_id: techId,
        inventory_id:  invId,
        resolved:      false,
        created_at:    new Date().toISOString(),
      });
    }

    const mensagemRecontagem = recountItems.length > 0
      ? `Encontrei *${recountItems.length}* peça(s) com divergência no seu inventário:\n\n` +
        recountItems.map(i =>
          `• *${i.code}* — ${i.name}\n  Sistema: ${i.system_qty} | Você contou: ${i.physical_qty}`
        ).join('\n') +
        `\n\nPor favor, recontar estas peças e informar os valores corretos.`
      : null;

    return NextResponse.json({
      ok:               true,
      inventory_id:     invId,
      tecnico:          inventory.technicians?.name,
      status:           newStatus,
      total_contados:   countedItems.length,
      total_divergencias: divergencesToInsert.length,
      recontagem:       recountItems.length,
      excesso:          surplusItems.length,
      mensagem_recontagem: mensagemRecontagem,
      itens_recontagem: recountItems,
      itens_excesso:    surplusItems,
    });

  } catch (err) {
    console.error('[finalize-inventory]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
