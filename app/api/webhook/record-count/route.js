import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getConsolidatedTechnicianItems } from '@/lib/db';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { nome, item_code, item_name, physical_qty } = body;

    if (!nome || item_code === undefined || physical_qty === undefined) {
      return NextResponse.json({ error: 'nome, item_code e physical_qty são obrigatórios' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const physQty = Number(physical_qty);
    // Remove zeros à esquerda para bater com qualquer formato (11232522 = 000000000011232522)
    const code = String(item_code).trim().replace(/^0+/, '') || '0';

    // 1. Técnico
    const { data: tech } = await supabase
      .from('technicians')
      .select('id, name')
      .ilike('name', `%${String(nome).trim()}%`)
      .limit(1)
      .maybeSingle();

    if (!tech) {
      return NextResponse.json({ error: `Técnico "${nome}" não encontrado` }, { status: 404 });
    }

    // 2. Inventário ativo
    let inventory = null;
    for (const status of ['in_progress', 'pending']) {
      const { data } = await supabase
        .from('inventories')
        .select('id, status, started_at, counted_items, total_items, week_ref')
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

    // 3. system_qty em tempo real direto do technician_items
    //    (já sincronizado com o Databricks pelo sync/pecas)
    const { data: techItemRows } = await supabase
      .from('technician_items')
      .select('item_quantity')
      .eq('technician_id', tech.id)
      .ilike('item_code', `%${code}`)
      .eq('active', true);

    const systemQty = (techItemRows || []).reduce(
      (sum, r) => sum + (Number(r.item_quantity) || 0), 0
    );

    // 4. Upsert: atualiza se já existe, insere se não existe
    const { data: existingRow } = await supabase
      .from('inventory_items')
      .select('id')
      .eq('inventory_id', inventory.id)
      .ilike('item_code', `%${code}`)
      .limit(1)
      .maybeSingle();

    let itemId;
    if (existingRow) {
      await supabase
        .from('inventory_items')
        .update({
          physical_qty: physQty,
          system_qty:   systemQty,
          status:       'counted',
          counted_at:   new Date().toISOString(),
        })
        .eq('id', existingRow.id);
      itemId = existingRow.id;
    } else {
      const { data: newRow } = await supabase
        .from('inventory_items')
        .insert({
          inventory_id: inventory.id,
          item_code:    code,
          item_name:    item_name || code,
          system_qty:   systemQty,
          physical_qty: physQty,
          status:       'counted',
          counted_at:   new Date().toISOString(),
        })
        .select('id')
        .single();
      itemId = newRow?.id;
    }

    // 5. Atualiza contadores do inventário
    const { count: countedNow } = await supabase
      .from('inventory_items')
      .select('id', { count: 'exact', head: true })
      .eq('inventory_id', inventory.id)
      .not('physical_qty', 'is', null);

    const inventoryUpdate = {
      status:        'in_progress',
      counted_items: countedNow || 0,
      updated_at:    new Date().toISOString(),
    };
    if (!inventory.started_at) {
      inventoryUpdate.started_at = new Date().toISOString();
    }

    // Define total_items na primeira contagem (quando ainda não foi definido)
    if (!inventory.total_items) {
      try {
        const { data: schedule } = await supabase
          .from('inventory_schedules')
          .select('scheduled_subgroup')
          .eq('inventory_id', inventory.id)
          .maybeSingle();

        const subgroup = schedule?.scheduled_subgroup || null;
        const allItems = await getConsolidatedTechnicianItems(supabase, tech.id, subgroup);
        if (allItems && allItems.length > 0) {
          inventoryUpdate.total_items = allItems.length;
        }
      } catch (e) {
        // não crítico — ignora se falhar
      }
    }

    await supabase.from('inventories').update(inventoryUpdate).eq('id', inventory.id);

    return NextResponse.json({
      ok:            true,
      inventory_id:  inventory.id,
      item_id:       itemId,
      item_code:     code,
      physical_qty:  physQty,
      system_qty:    systemQty,
      counted_items: inventoryUpdate.counted_items,
      total_items:   inventory.total_items,
    });

  } catch (err) {
    console.error('[record-count]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
