import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getConsolidatedTechnicianItems } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const SECRET = process.env.DISPATCH_SECRET || '';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { inventory_id, nome } = body;

    const supabase = createServiceClient();

    // 1. Localizar o inventário
    let inventory;
    if (inventory_id) {
      const { data, error } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, status, technicians(id, name, phone, email)')
        .eq('id', parseInt(inventory_id))
        .single();
      if (error || !data) return NextResponse.json({ error: 'Inventário não encontrado' }, { status: 404 });
      inventory = data;
    } else if (nome) {
      const { data: tech } = await supabase
        .from('technicians')
        .select('id, name, phone, email')
        .ilike('name', `%${String(nome).trim()}%`)
        .limit(1)
        .single();
      if (!tech) return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });

      const { data, error } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, status, technicians(id, name, phone, email)')
        .eq('technician_id', tech.id)
        .in('status', ['in_progress', 'pending', 'recount_pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error || !data) return NextResponse.json({ error: 'Inventário ativo não encontrado' }, { status: 404 });
      inventory = data;
    } else {
      return NextResponse.json({ error: 'Informe inventory_id ou nome' }, { status: 400 });
    }

    const { id: invId, technician_id: techId } = inventory;

    // Limpa divergências anteriores deste inventário (para recontagem não duplicar)
    await supabase.from('divergences').delete().eq('inventory_id', invId);

    // 2. Busca apenas itens contados — system_qty já correto, gravado pelo record-count
    const { data: countedItems } = await supabase
      .from('inventory_items')
      .select('id, item_code, item_name, physical_qty, system_qty, counted_at')
      .eq('inventory_id', invId)
      .not('physical_qty', 'is', null);

    if (!countedItems || countedItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item foi contado ainda' }, { status: 400 });
    }

    // 3. Detectar peças do subgrupo que não foram contadas (physical_qty ausente)
    //    Busca todas as peças esperadas e compara com o que foi contado
    try {
      const { data: schedule } = await supabase
        .from('inventory_schedules')
        .select('scheduled_subgroup')
        .eq('inventory_id', invId)
        .maybeSingle();

      const subgroup = schedule?.scheduled_subgroup || null;
      const expectedItems = await getConsolidatedTechnicianItems(supabase, techId, subgroup);

      if (expectedItems && expectedItems.length > 0) {
        // Normaliza os códigos contados (remove zeros à esquerda) para comparação
        const countedCodes = new Set(
          countedItems.map(i => String(i.item_code).replace(/^0+/, '') || '0')
        );

        for (const expected of expectedItems) {
          const normalizedCode = String(expected.item_code).replace(/^0+/, '') || '0';
          if (countedCodes.has(normalizedCode)) continue; // já foi contada

          const sysQty = Number(expected.item_quantity) || 0;
          if (sysQty === 0) continue; // sem quantidade no sistema, ignora

          // Insere linha como não contada (physical_qty = 0)
          await supabase.from('inventory_items').insert({
            inventory_id:  invId,
            item_code:     expected.item_code,
            item_name:     expected.item_name,
            item_subgroup: expected.item_subgroup || subgroup || null,
            system_qty:    sysQty,
            physical_qty:  0,
            has_divergence: true,
            status:        'recount',
            counted_at:    new Date().toISOString(),
          });

          // Adiciona como item contado para entrar na comparação abaixo
          countedItems.push({
            id:           null,
            item_code:    expected.item_code,
            item_name:    expected.item_name,
            physical_qty: 0,
            system_qty:   sysQty,
            counted_at:   new Date().toISOString(),
            _already_saved: true,
          });
        }
      }
    } catch (e) {
      console.warn('[finalize-inventory] Falha ao verificar peças não contadas:', e.message);
    }

    // 4. Comparar e classificar
    const eraRecontagem = inventory.status === 'recount_pending';

    const divergencesToInsert = [];
    const recountItems        = [];
    const surplusItems        = [];
    const itensSummary        = [];
    const itemUpdates         = [];

    for (const item of countedItems) {
      const sysQty  = Number(item.system_qty)  || 0;
      const physQty = Number(item.physical_qty);
      const diff    = physQty - sysQty;
      const hasDiv  = diff !== 0;
      const pct     = sysQty > 0
        ? parseFloat(Math.abs((diff / sysQty) * 100).toFixed(2))
        : physQty > 0 ? 100 : 0;

      if (!item._already_saved && item.id) {
        const needsRecount = !eraRecontagem && diff < 0;
        itemUpdates.push({
          id:            item.id,
          has_divergence: hasDiv,
          status:        needsRecount ? 'recount' : 'counted',
        });
      }

      itensSummary.push({
        item_code:    item.item_code,
        item_name:    item.item_name,
        system_qty:   sysQty,
        physical_qty: physQty,
        difference:   diff,
        status_item:  !hasDiv ? 'ok' : diff < 0 ? 'falta' : 'excesso',
      });

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

    // Atualiza itens em paralelo (cada um com has_divergence correto)
    const now = new Date().toISOString();
    if (itemUpdates.length > 0) {
      await Promise.all(
        itemUpdates.map(({ id, has_divergence, status }) =>
          supabase.from('inventory_items')
            .update({ has_divergence, status, counted_at: now })
            .eq('id', id)
        )
      );
    }

    // Ordena: divergências primeiro, depois itens ok
    itensSummary.sort((a, b) => {
      const order = { falta: 0, excesso: 1, ok: 2 };
      return (order[a.status_item] ?? 3) - (order[b.status_item] ?? 3);
    });

    // 4. Gravar divergências
    if (divergencesToInsert.length > 0) {
      await supabase.from('divergences').insert(divergencesToInsert);
    }

    // 5. Atualizar inventário
    // Se já era recontagem, fecha como completed independente de divergências
    // (evita loop infinito de recontagem → recontagem → recontagem)
    const newStatus = (!eraRecontagem && recountItems.length > 0) ? 'recount_pending' : 'completed';

    await supabase
      .from('inventories')
      .update({
        status:           newStatus,
        is_recount:       eraRecontagem,
        completed_at:     new Date().toISOString(),
        total_items:      countedItems.length,
        counted_items:    countedItems.length,
        divergence_count: divergencesToInsert.length,
        updated_at:       new Date().toISOString(),
      })
      .eq('id', invId);

    // 6. Alerta de excesso para supervisor
    if (surplusItems.length > 0) {
      const techName = inventory.technicians?.name || 'Técnico';
      await supabase.from('alerts').insert({
        type:          'surplus',
        severity:      'medium',
        title:         `Excesso de peças — ${techName}`,
        description:   `${surplusItems.length} peça(s) acima do sistema: ${surplusItems.map(i => `${i.code} (+${i.diff})`).join(', ')}`,
        technician_id: techId,
        inventory_id:  invId,
        resolved:      false,
        created_at:    new Date().toISOString(),
      });
    }

    // Se era recontagem, não gera nova mensagem de recontagem (retorna recontagem: 0)
    const mensagemRecontagem = (!eraRecontagem && recountItems.length > 0)
      ? `Encontrei *${recountItems.length}* peça(s) com divergência:\n\n` +
        recountItems.map(i =>
          `• *${i.code}* — ${i.name}\n  Sistema: ${i.system_qty} | Você contou: ${i.physical_qty}`
        ).join('\n') +
        `\n\nPor favor, recontar estas peças.`
      : null;

    return NextResponse.json({
      ok:                  true,
      inventory_id:        invId,
      tecnico:             inventory.technicians?.name,
      email_tecnico:       inventory.technicians?.email || null,
      week_ref:            inventory.week_ref,
      tipo_finalizacao:    eraRecontagem ? 'recontagem' : '1a_contagem',
      status:              newStatus,
      total_contados:      countedItems.length,
      total_divergencias:  divergencesToInsert.length,
      recontagem:          eraRecontagem ? 0 : recountItems.length,
      excesso:             surplusItems.length,
      enviar_email:        newStatus === 'completed' && divergencesToInsert.length === 0,
      mensagem_recontagem: mensagemRecontagem,
      itens_recontagem:    recountItems,
      itens_excesso:       surplusItems,
      itens_contados:      itensSummary,
    });

  } catch (err) {
    console.error('[finalize-inventory]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
