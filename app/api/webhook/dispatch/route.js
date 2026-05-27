import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateSchedule, createGptSession } from '@/lib/db-gptmaker';
import { createInventory, updateInventory, createFlowLog } from '@/lib/db';
import crypto from 'crypto';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

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
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const scheduleId = body.schedule_id || null;

    const supabase = createServiceClient();
    let schedules = [];

    if (scheduleId) {
      const { data } = await supabase
        .from('inventory_schedules')
        .select('*, technicians(*)')
        .eq('id', scheduleId);
      if (data) schedules = data;
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        const tech = schedule.technicians;
        if (!tech) continue;

        // USA O QUE FOI SALVO NO AGENDAMENTO (SSD/HD e as peças)
        const consolidatedItems = schedule.scheduled_items || [];
        const weekSubgroup = schedule.scheduled_subgroup;

        if (consolidatedItems.length === 0) continue;

        // Cria o inventário oficial
        const inventory = await createInventory({
          technician_id: schedule.technician_id,
          status: 'pending',
          week_ref: schedule.week_ref || 'AUTO',
          notes: `Inventário agendado: ${weekSubgroup || 'Geral'}`
        });

        // Insere os itens no inventário
        const itemRows = consolidatedItems.map((item) => ({
          inventory_id: inventory.id,
          item_code: item.item_code,
          item_name: item.item_name,
          subgroup: item.item_subgroup || item.subgroup || weekSubgroup,
          system_qty: item.item_quantity,
          status: 'pending',
        }));

        await supabase.from('inventory_items').insert(itemRows);
        await updateInventory(inventory.id, { status: 'in_progress', started_at: new Date().toISOString() });

        const firstMessage = buildFirstMessage(tech.name, consolidatedItems, weekSubgroup);
        const sessionToken = crypto.randomBytes(32).toString('hex');

        await createGptSession({
          inventory_id: inventory.id,
          technician_id: schedule.technician_id,
          phone: tech.phone,
          session_token: sessionToken
        });

        await updateSchedule(schedule.id, { status: 'dispatched', inventory_id: inventory.id });

        results.push({
          schedule_id: schedule.id,
          ok: true,
          phone: tech.phone,
          technician_name: tech.name,
          message: firstMessage, // ESTA É A MENSAGEM PARA O DISPARA.AI
          session_token: sessionToken
        });
      } catch (err) {
        results.push({ schedule_id: schedule.id, ok: false, reason: err.message });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
