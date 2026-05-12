/**
 * POST /api/webhook/dispatch-databricks
 * Versão aprimorada do dispatch que busca as peças diretamente do Databricks
 * em vez de usar a tabela technician_items do banco local.
 *
 * Fluxo:
 * 1. Recebe o schedule_id (agendamento do supervisor)
 * 2. Busca o técnico e seu nome no Databricks
 * 3. Seleciona N peças aleatórias do portfólio real em tempo real
 * 4. Cria o inventário com essas peças
 * 5. Cria sessão GPT Maker e envia primeira mensagem ao técnico
 *
 * Autenticação: header x-dispatch-secret
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTechnicianItemsSample } from '@/lib/databricks';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GPTMAKER_API_URL = 'https://api.gptmaker.ai/v2/send-message';

function getWeekRef(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function POST(request) {
  // Autenticação
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { schedule_id, items_count = 10 } = body;

  if (!schedule_id) {
    return NextResponse.json({ error: 'schedule_id é obrigatório' }, { status: 400 });
  }

  // Busca o agendamento com dados do técnico
  const { data: schedule, error: schedError } = await supabase
    .from('inventory_schedules')
    .select(`
      id,
      technician_id,
      week_ref,
      items_count,
      status,
      technicians (
        id,
        name,
        phone,
        databricks_name,
        active
      )
    `)
    .eq('id', schedule_id)
    .single();

  if (schedError || !schedule) {
    return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
  }

  if (schedule.status !== 'pending') {
    return NextResponse.json({
      error: `Agendamento já foi processado (status: ${schedule.status})`
    }, { status: 400 });
  }

  const technician = schedule.technicians;
  if (!technician || !technician.active) {
    return NextResponse.json({ error: 'Técnico não encontrado ou inativo' }, { status: 400 });
  }

  const searchName = technician.databricks_name || technician.name;
  const totalItems = schedule.items_count || items_count;
  const weekRef = schedule.week_ref || getWeekRef();

  // Verifica se já existe inventário para esta semana
  const { data: existing } = await supabase
    .from('inventories')
    .select('id, status')
    .eq('technician_id', technician.id)
    .eq('week_ref', weekRef)
    .is('recount_of', null)
    .single();

  if (existing && !['cancelled', 'abandoned'].includes(existing.status)) {
    return NextResponse.json({
      error: `Já existe inventário para ${technician.name} na semana ${weekRef} (ID: ${existing.id}, status: ${existing.status})`
    }, { status: 409 });
  }

  // Busca peças em tempo real no Databricks
  let items;
  try {
    items = await getTechnicianItemsSample(searchName, totalItems);
  } catch (e) {
    // Atualiza o agendamento com erro
    await supabase
      .from('inventory_schedules')
      .update({ status: 'cancelled', notes: `Erro Databricks: ${e.message}`, updated_at: new Date().toISOString() })
      .eq('id', schedule_id);

    return NextResponse.json({
      error: `Erro ao buscar peças no Databricks: ${e.message}`,
      technician: technician.name,
      searched_as: searchName,
    }, { status: 500 });
  }

  if (!items || items.length === 0) {
    await supabase
      .from('inventory_schedules')
      .update({ status: 'cancelled', notes: `Técnico "${searchName}" sem peças no Databricks`, updated_at: new Date().toISOString() })
      .eq('id', schedule_id);

    return NextResponse.json({
      error: `Nenhuma peça encontrada para "${searchName}" no Databricks`,
      hint: 'Verifique se o nome do técnico no sistema corresponde exatamente ao nome no Data Lake'
    }, { status: 404 });
  }

  // Cria o inventário
  const { data: inventory, error: invError } = await supabase
    .from('inventories')
    .insert({
      technician_id: technician.id,
      week_ref: weekRef,
      status: 'in_progress',
      items_total: items.length,
      items_counted: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }

  // Insere as peças no inventário
  const inventoryItems = items.map((item, index) => ({
    inventory_id: inventory.id,
    item_code: item.item_code,
    item_name: item.item_name,
    unit: item.unit || 'UN',
    expected_qty: item.expected_qty,
    counted_qty: null,
    status: 'pending',
    sort_order: index,
    created_at: new Date().toISOString(),
  }));

  const { error: itemsError } = await supabase
    .from('inventory_items')
    .insert(inventoryItems);

  if (itemsError) {
    await supabase.from('inventories').delete().eq('id', inventory.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Atualiza o agendamento como disparado
  await supabase
    .from('inventory_schedules')
    .update({
      status: 'dispatched',
      inventory_id: inventory.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schedule_id);

  // Cria sessão GPT Maker
  const sessionToken = crypto.randomBytes(32).toString('hex');
  const firstItem = items[0];

  const { error: sessionError } = await supabase
    .from('gptmaker_sessions')
    .insert({
      inventory_id: inventory.id,
      technician_id: technician.id,
      phone: technician.phone || '',
      technician_phone: technician.phone || '',
      technician_name: technician.name,
      session_token: sessionToken,
      current_item_index: 0,
      status: 'active',
      last_message_at: new Date().toISOString(),
      renotify_count: 0,
      schedule_id: schedule_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

  if (sessionError) {
    console.error('[dispatch-databricks] Erro ao criar sessão:', sessionError.message);
  }

  // Monta e envia a primeira mensagem
  const firstMessage =
    `Olá, ${technician.name.split(' ')[0]}! 👋\n\n` +
    `É hora do inventário semanal — semana *${weekRef}*.\n\n` +
    `Vamos contar *${items.length} peça(s)*. Responda apenas com o número de cada uma.\n\n` +
    `📦 *Peça 1 de ${items.length}*\n` +
    `*${firstItem.item_name}*\n` +
    `Código: ${firstItem.item_code}\n` +
    `Quantidade esperada: ${firstItem.expected_qty}\n\n` +
    `Quantas unidades você tem agora?`;

  let dispatched = false;
  let dispatchError = null;

  if (technician.phone && process.env.GPTMAKER_API_TOKEN) {
    try {
      const res = await fetch(GPTMAKER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GPTMAKER_API_TOKEN}`,
        },
        body: JSON.stringify({
          phone: technician.phone,
          message: firstMessage,
          custom_fields: { session_token: sessionToken },
        }),
      });
      dispatched = res.ok;
      if (!res.ok) dispatchError = await res.text();
    } catch (e) {
      dispatchError = e.message;
    }
  } else {
    dispatchError = !technician.phone
      ? 'Técnico sem telefone cadastrado'
      : 'GPTMAKER_API_TOKEN não configurado';
  }

  return NextResponse.json({
    ok: true,
    inventory_id: inventory.id,
    technician: technician.name,
    databricks_name: searchName,
    week_ref: weekRef,
    items_count: items.length,
    items_sample: items.map((i) => ({ code: i.item_code, name: i.item_name, expected: i.expected_qty })),
    dispatched,
    dispatch_error: dispatchError,
  });
}
