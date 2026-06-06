import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getConsolidatedTechnicianItems } from '@/lib/db';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServiceClient();
    const now = new Date();

    // Início do dia de hoje em SP (UTC-3): 00:00 SP = 03:00 UTC
    const nowSP = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const hojeInicio = new Date(Date.UTC(
      nowSP.getUTCFullYear(), nowSP.getUTCMonth(), nowSP.getUTCDate(),
      3, 0, 0, 0,
    ));

    // Busca agendamentos do dia cujo horário JÁ CHEGOU e o D-1 já foi enviado (dispatched).
    // Status 'dispatched' = aviso D-1 enviado, inventário criado, aguardando disparo no horário.
    // O filtro scheduled_at <= now garante que o disparo só ocorre no horário correto.
    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select(`
        id, scheduled_at, scheduled_subgroup, inventory_id,
        technicians ( id, name, phone )
      `)
      .eq('status', 'dispatched')
      .gte('scheduled_at', hojeInicio.toISOString())
      .lte('scheduled_at', now.toISOString());

    if (error) throw error;

    // Para cada agendamento pendente do dia: garante que inventory_items
    // existam com system_qty frescos (após o sync Databricks da manhã).
    for (const schedule of (schedules || [])) {
      const techId = schedule.technicians?.id;
      const invId  = schedule.inventory_id;
      if (!invId || !techId) continue;

      // Só atualiza se o inventário ainda não foi iniciado (nenhuma contagem feita)
      const { count: countedCount } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('inventory_id', invId)
        .not('physical_qty', 'is', null);

      if (countedCount && countedCount > 0) continue;

      // Busca peças frescas do technician_items (já sincronizado com Databricks)
      const pecas = await getConsolidatedTechnicianItems(supabase, techId, schedule.scheduled_subgroup);
      if (!pecas || pecas.length === 0) continue;

      // Remove linhas de dispatch antigas (physical_qty = null) e recria com qty atualizada
      await supabase
        .from('inventory_items')
        .delete()
        .eq('inventory_id', invId)
        .is('physical_qty', null);

      const inventoryItems = pecas.map(item => ({
        inventory_id: invId,
        item_code:    item.item_code,
        item_name:    item.item_name,
        item_subgroup: item.item_subgroup || item.subgroup || schedule.scheduled_subgroup || null,
        system_qty:   Number(item.item_quantity) || 0,
        physical_qty: null,
        status:       'pending',
      }));

      await supabase.from('inventory_items').insert(inventoryItems);
      await supabase.from('inventories')
        .update({ total_items: pecas.length })
        .eq('id', invId);
    }

    const schedulesToDispatch = (schedules || []).map(s => ({
      schedule_id: String(s.id),
      nome:        s.technicians?.name || 'Técnico',
      telefone:    s.technicians?.phone || '',
      subgrupo:    s.scheduled_subgroup || 'Geral',
    }));

    return NextResponse.json({
      success: true,
      count:   schedulesToDispatch.length,
      content: schedulesToDispatch,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
