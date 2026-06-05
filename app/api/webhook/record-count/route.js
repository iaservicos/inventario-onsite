import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { nome, item_code, physical_qty } = body;

    if (!nome || item_code === undefined || physical_qty === undefined) {
      return NextResponse.json({ error: 'nome, item_code e physical_qty são obrigatórios' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const physQty = Number(physical_qty);

    // 1. Encontra o técnico pelo nome (busca parcial, case-insensitive)
    const { data: tech } = await supabase
      .from('technicians')
      .select('id, name')
      .ilike('name', `%${nome.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (!tech) {
      return NextResponse.json({ error: `Técnico "${nome}" não encontrado` }, { status: 404 });
    }

    // 2. Encontra o inventário ativo (in_progress primeiro, depois pending)
    let inventory = null;
    for (const status of ['in_progress', 'pending']) {
      const { data } = await supabase
        .from('inventories')
        .select('id, status, started_at, counted_items, total_items')
        .eq('technician_id', tech.id)
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) { inventory = data; break; }
    }

    if (!inventory) {
      return NextResponse.json({ error: 'Inventário ativo não encontrado' }, { status: 404 });
    }

    // 3. Procura a linha pré-criada pelo dispatch (physical_qty ainda null)
    //    Usa ilike para tolerar diferenças de capitalização no código
    const { data: dispatchRow } = await supabase
      .from('inventory_items')
      .select('id, item_code, item_name, system_qty, physical_qty, sort_order')
      .eq('inventory_id', inventory.id)
      .ilike('item_code', item_code.trim())
      .is('physical_qty', null)
      .maybeSingle();

    let itemId;
    let systemQty = 0;

    if (dispatchRow) {
      // Atualiza a linha criada pelo dispatch — system_qty já está correto
      systemQty = Number(dispatchRow.system_qty) || 0;
      await supabase
        .from('inventory_items')
        .update({
          physical_qty: physQty,
          status: 'counted',
          counted_at: new Date().toISOString(),
        })
        .eq('id', dispatchRow.id);
      itemId = dispatchRow.id;
    } else {
      // Item não está na lista do dispatch: pode ser re-contagem ou item inesperado
      const { data: existingRow } = await supabase
        .from('inventory_items')
        .select('id, system_qty')
        .eq('inventory_id', inventory.id)
        .ilike('item_code', item_code.trim())
        .maybeSingle();

      if (existingRow) {
        // Re-contagem: atualiza physical_qty
        systemQty = Number(existingRow.system_qty) || 0;
        await supabase
          .from('inventory_items')
          .update({ physical_qty: physQty, status: 'counted', counted_at: new Date().toISOString() })
          .eq('id', existingRow.id);
        itemId = existingRow.id;
      } else {
        // Item completamente inesperado — insere como novo
        const { data: newRow } = await supabase
          .from('inventory_items')
          .insert({
            inventory_id: inventory.id,
            item_code: item_code.trim(),
            item_name: 'Item não catalogado',
            system_qty: 0,
            physical_qty: physQty,
            status: 'counted',
            counted_at: new Date().toISOString(),
          })
          .select('id, system_qty')
          .single();
        itemId = newRow?.id;
        systemQty = 0;
      }
    }

    // 4. Atualiza o inventário: status in_progress, started_at se primeiro item, counted_items
    const { count: countedNow } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('inventory_id', inventory.id)
      .not('physical_qty', 'is', null);

    const inventoryUpdate = {
      status: 'in_progress',
      counted_items: countedNow || 0,
      updated_at: new Date().toISOString(),
    };
    if (!inventory.started_at) {
      inventoryUpdate.started_at = new Date().toISOString();
    }

    await supabase.from('inventories').update(inventoryUpdate).eq('id', inventory.id);

    return NextResponse.json({
      ok: true,
      inventory_id: inventory.id,
      item_id: itemId,
      item_code: item_code.trim(),
      physical_qty: physQty,
      system_qty: systemQty,
      counted_items: inventoryUpdate.counted_items,
      total_items: inventory.total_items,
    });

  } catch (err) {
    console.error('[record-count]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
