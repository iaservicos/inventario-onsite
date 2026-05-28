import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { createInventory, createFlowLog } from '@/lib/db';

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

    if (!scheduleId) {
      return NextResponse.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Busca dados do agendamento e do técnico
    const { data: schedule, error: schError } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*)')
      .eq('id', scheduleId)
      .single();

    if (schError || !schedule) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const tech = schedule.technicians;
    const items = schedule.scheduled_items || [];

    // 2. Cria o inventário no banco (Status inicial: pending)
    const inventory = await createInventory(supabase, {
      technician_id: tech.id,
      schedule_id: schedule.id,
      status: 'pending',
      items: items
    });

    // 3. Atualiza o status do agendamento para 'dispatched'
    await supabase
      .from('inventory_schedules')
      .update({ status: 'dispatched' })
      .eq('id', scheduleId);

    // 4. Registra o log de disparo
    await createFlowLog(supabase, {
      inventory_id: inventory.id,
      step: 'dispatch_initiated',
      details: { method: 'power_automate_dispara_ai' }
    });

    // 5. Constrói a mensagem para o Power Automate enviar ao dispara.ai
    const message = buildFirstMessage(tech.name, items, schedule.scheduled_subgroup);

    return NextResponse.json({
      success: true,
      inventory_id: inventory.id,
      phone: tech.phone,
      technicianName: tech.name,
      message: message
    });

  } catch (err) {
    console.error('Dispatch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}