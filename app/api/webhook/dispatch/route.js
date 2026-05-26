import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateSchedule, createGptSession } from '@/lib/db-gptmaker';
import { createInventory, updateInventory, createFlowLog } from '@/lib/db';
import crypto from 'crypto';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';

function buildFirstMessage(techName, items, weekSubgroup) {
  const subgroupLabel = weekSubgroup ? ` (foco: ${weekSubgroup})` : '';
  const itemLines = items
    .map((item, i) => `${i + 1}. ${item.item_name} — Sistema: ${item.item_quantity} un.`)
    .join('\n');

  return (
    `Olá, ${techName}! Chegou a hora do seu inventário semanal${subgroupLabel}.\n\n` +
    `Preciso que você conte as seguintes peças e me informe a quantidade física de cada uma:\n\n` +
    `${itemLines}\n\n` +
    `Vamos começar? Me informe a quantidade da peça 1.`
  );
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const scheduleId = body.schedule_id || null;

    const supabase = createServiceClient();
    let schedules = [];

    if (scheduleId) {
      const { data } = await supabase.from('inventory_schedules').select('*, technicians(*), scheduled_subgroup, scheduled_items').eq('id', scheduleId).eq('status', 'pending').single();
      if (data) schedules = [data];
    } else {
      const { data } = await supabase.from('inventory_schedules').select('*, technicians(*), scheduled_subgroup, scheduled_items').eq('status', 'pending');
      schedules = data || [];
    }

    if (schedules.length === 0) return NextResponse.json({ ok: true, dispatched: 0 });

    const results = [];
    for (const schedule of schedules) {
      try {
        const tech = schedule.technicians;
        const consolidatedItems = schedule.scheduled_items || [];
        const weekSubgroup = schedule.scheduled_subgroup;

        const inventory = await createInventory({
          technician_id: schedule.technician_id,
          week_ref: schedule.week_ref,
          total_items: consolidatedItems.length,
        });

        const itemRows = consolidatedItems.map(item => ({
          inventory_id: inventory.id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_subgroup: item.item_subgroup,
          system_qty: item.item_quantity,
          status: 'pending',
        }));

        await supabase.from('inventory_items').insert(itemRows);
        await updateInventory(inventory.id, { status: 'in_progress', started_at: new Date().toISOString() });

        const firstMessage = buildFirstMessage(tech.name, consolidatedItems, weekSubgroup);

        const sessionToken = crypto.randomBytes(32).toString('hex');
        await createGptSession({ inventory_id: inventory.id, technician_id: schedule.technician_id, phone: tech.phone, session_token: sessionToken });
        await updateSchedule(schedule.id, { status: 'dispatched', inventory_id: inventory.id });

        results.push({ 
          schedule_id: schedule.id, 
          ok: true, 
          session_token: sessionToken, 
          first_message: firstMessage, 
          phone: tech.phone,
          technician_name: tech.name,
          items_count: consolidatedItems.length,
          items: consolidatedItems.map(i => ({ code: i.item_code, name: i.item_name, qty: i.item_quantity }))
        });
      } catch (err) {
        results.push({ schedule_id: schedule.id, ok: false, reason: err.message });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
