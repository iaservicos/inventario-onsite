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

    if (!scheduleId) {
      return NextResponse.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();
    
    // Busca o agendamento específico com os dados do técnico
    const { data: schedule, error: scheduleError } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*)')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const tech = schedule.technicians;
    if (!tech) {
      return NextResponse.json({ error: 'Técnico não encontrado no agendamento' }, { status: 404 });
    }

    // USA OS DADOS QUE SALVAMOS NO ALERTA D-1
    const consolidatedItems = schedule.scheduled_items || [];
    const weekSubgroup = schedule.scheduled_subgroup;

    if (consolidatedItems.length === 0) {
      return NextResponse.json({ error: 'Nenhum item encontrado para este agendamento' }, { status: 400 });
    }

    // 1. Cria o inventário oficial
    const inventory = await createInventory({
      technician_id: schedule.technician_id,
      status: 'pending',
      week_ref: schedule.week_ref || 'AUTO',
      notes: `Inventário: ${weekSubgroup || 'Geral'}`
    });

    // 2. Insere os itens no inventário
    const itemRows = consolidatedItems.map((item) => ({
      inventory_id: inventory.id,
      item_code: item.item_code,
      item_name: item.item_name,
      subgroup: item.item_subgroup || item.subgroup || weekSubgroup,
      system_qty: item.item_quantity,
      status: 'pending',
    }));

    await supabase.from('inventory_items').insert(itemRows);
    
    // 3. Atualiza status para em progresso
    await updateInventory(inventory.id, { 
      status: 'in_progress', 
      started_at: new Date().toISOString() 
    });

    // 4. Cria a sessão do GPT Maker
    const sessionToken = crypto.randomBytes(32).toString('hex');
    await createGptSession({
      inventory_id: inventory.id,
      technician_id: schedule.technician_id,
      phone: tech.phone,
      session_token: sessionToken
    });

    // 5. Marca o agendamento como disparado
    await updateSchedule(schedule.id, { 
      status: 'dispatched', 
      inventory_id: inventory.id 
    });

    // RETORNO PARA O POWER AUTOMATE / DISPARA.AI
    return NextResponse.json({
      ok: true,
      result: {
        phone: tech.phone,
        technician_name: tech.name,
        message: buildFirstMessage(tech.name, consolidatedItems, weekSubgroup),
        session_token: sessionToken
      }
    });

  } catch (err) {
    console.error('Erro no dispatch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
