import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTechnicianItems } from '@/lib/databricks';
import { getConsolidatedTechnicianItems } from '@/lib/db';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getWeekRef(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function buildDatabricksQtyMap(databricksItems) {
  const map = {};
  for (const item of (databricksItems || [])) {
    const code = item.item_code;
    map[code] = (map[code] || 0) + (Number(item.item_quantity) || 0);
  }
  return map;
}

export async function POST(request) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { schedule_id } = body;

  if (!schedule_id) {
    return NextResponse.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
  }

  const { data: schedule, error: schedError } = await supabase
    .from('inventory_schedules')
    .select(`
      id, technician_id, week_ref, scheduled_subgroup, inventory_type, status,
      technicians ( id, name, phone, databricks_name, active )
    `)
    .eq('id', schedule_id)
    .single();

  if (schedError || !schedule) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  if (!['pending', 'dispatched'].includes(schedule.status)) {
    return NextResponse.json({
      error: `Agendamento já foi processado (status: ${schedule.status})`
    }, { status: 400 });
  }

  const technician = schedule.technicians;
  if (!technician || !technician.active) {
    return NextResponse.json({ error: 'Técnico não encontrado ou inativo' }, { status: 400 });
  }

  const searchName = technician.databricks_name || technician.name;
  const weekRef = schedule.week_ref || getWeekRef();
  const isGeneralInventory = schedule.inventory_type === 'general';
  const scheduledSubgroup = isGeneralInventory ? null : (schedule.scheduled_subgroup || null);

  // Claim atômico — evita inventário duplicado em requests simultâneos
  if (schedule.status === 'pending') {
    const { data: claimed } = await supabase
      .from('inventory_schedules')
      .update({ status: 'dispatched', updated_at: new Date().toISOString() })
      .eq('id', schedule_id)
      .eq('status', 'pending')
      .select('id')
      .maybeSingle();

    if (!claimed) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: 'Agendamento já foi iniciado por outra requisição simultânea',
      }, { status: 200 });
    }
  }

  const { data: existing } = await supabase
    .from('inventories')
    .select('id, status')
    .eq('technician_id', technician.id)
    .eq('week_ref', weekRef)
    .is('recount_of', null)
    .maybeSingle();

  if (existing && !['cancelled', 'abandoned'].includes(existing.status)) {
    return NextResponse.json({
      error: `Já existe inventário para ${technician.name} na semana ${weekRef} (ID: ${existing.id}, status: ${existing.status})`
    }, { status: 409 });
  }

  const subgroupItems = await getConsolidatedTechnicianItems(supabase, technician.id, scheduledSubgroup);

  if (!subgroupItems || subgroupItems.length === 0) {
    await supabase
      .from('inventory_schedules')
      .update({ status: 'cancelled', notes: `Técnico sem peças no subgrupo "${scheduledSubgroup}"`, updated_at: new Date().toISOString() })
      .eq('id', schedule_id);

    return NextResponse.json({
      error: `Nenhuma peça encontrada para o subgrupo "${scheduledSubgroup}"`,
      technician: technician.name,
    }, { status: 404 });
  }

  let databricksQtyMap = {};
  let databricksSource = false;
  try {
    const databricksItems = await getTechnicianItems(searchName);
    if (databricksItems && databricksItems.length > 0) {
      databricksQtyMap = buildDatabricksQtyMap(databricksItems);
      databricksSource = true;
    }
  } catch (e) {
    console.warn('[dispatch-databricks] Databricks indisponível, usando technician_items:', e.message);
  }

  const items = subgroupItems.map(item => ({
    item_code:     item.item_code,
    item_name:     item.item_name,
    unit:          item.unit || 'UN',
    item_subgroup: item.item_subgroup || item.subgroup || scheduledSubgroup,
    item_quantity: databricksQtyMap[item.item_code] !== undefined
      ? databricksQtyMap[item.item_code]
      : (Number(item.item_quantity) || 0),
  }));

  const { data: inventory, error: invError } = await supabase
    .from('inventories')
    .insert({
      technician_id: technician.id,
      week_ref:      weekRef,
      status:        'in_progress',
      total_items:   items.length,
      counted_items: 0,
      created_at:    new Date().toISOString(),
      updated_at:    new Date().toISOString(),
    })
    .select()
    .single();

  if (invError) {
    console.error('[dispatch-databricks] Falha ao criar inventário:', invError.message);
    return NextResponse.json({ error: 'Falha ao criar inventário' }, { status: 500 });
  }

  const inventoryItems = items.map(item => ({
    inventory_id:  inventory.id,
    item_code:     item.item_code,
    item_name:     item.item_name,
    item_subgroup: item.item_subgroup || null,
    system_qty:    Number(item.item_quantity) || 0,
    physical_qty:  null,
    status:        'pending',
  }));

  const { error: itemsError } = await supabase
    .from('inventory_items')
    .insert(inventoryItems);

  if (itemsError) {
    console.error('[dispatch-databricks] Falha ao inserir itens:', itemsError.message);
    await supabase.from('inventories').delete().eq('id', inventory.id);
    return NextResponse.json({ error: 'Falha ao inserir itens do inventário' }, { status: 500 });
  }

  await supabase
    .from('inventory_schedules')
    .update({ inventory_id: inventory.id, updated_at: new Date().toISOString() })
    .eq('id', schedule_id);

  return NextResponse.json({
    ok:          true,
    inventory_id: inventory.id,
    technician:  technician.name,
    week_ref:    weekRef,
    subgroup:    scheduledSubgroup,
    items_count: items.length,
    qty_source:  databricksSource ? 'databricks' : 'technician_items',
  });
}
