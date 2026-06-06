/**
 * POST /api/webhook/dispatch-databricks
 * Versão aprimorada com seleção inteligente de peças por histórico de contagens.
 *
 * Lógica de seleção das 10 peças:
 * 1ª prioridade — peças que NUNCA foram contadas no sistema
 * 2ª prioridade — peças contadas há mais tempo (mais antigas no histórico)
 * 3ª prioridade — aleatório entre as restantes
 *
 * Autenticação: header x-dispatch-secret
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTechnicianItems } from '@/lib/databricks';
import { getConsolidatedTechnicianItems } from '@/lib/db';
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

/**
 * Monta mapa item_code → quantidade total consolidando remessas do Databricks.
 * Usado apenas para enriquecer as quantidades do sistema — a lista definitiva
 * de peças vem sempre de technician_items (que tem o subgrupo).
 */
function buildDatabricksQtyMap(databricksItems) {
  const map = {};
  for (const item of (databricksItems || [])) {
    const code = item.item_code;
    map[code] = (map[code] || 0) + (Number(item.item_quantity) || 0);
  }
  return map;
}

export async function POST(request) {
  // Autenticação
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { schedule_id } = body;

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
      scheduled_subgroup,
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
  const scheduledSubgroup = schedule.scheduled_subgroup || null;

  // "Claim" atômico: marca como dispatched ANTES de criar o inventário.
  // Usa WHERE status='pending' como condição — se dois requests chegarem ao mesmo tempo,
  // apenas um consegue fazer o update; o outro recebe 0 linhas e aborta.
  // Agendamentos já em 'dispatched' (retry após falha parcial) passam para o check de inventário.
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

  // Verifica se já existe inventário para esta semana (protege retries)
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

  // 1. Lista definitiva: todas as peças do subgrupo agendado (vem de technician_items)
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

  // 2. Enriquece quantidades com Databricks (melhor esforço — não bloqueia se falhar)
  let databricksQtyMap = {};
  let databricksSource = false;
  try {
    const databricksItems = await getTechnicianItems(searchName);
    if (databricksItems && databricksItems.length > 0) {
      databricksQtyMap = buildDatabricksQtyMap(databricksItems);
      databricksSource = true;
    }
  } catch (e) {
    console.warn('[dispatch-databricks] Databricks indisponível, usando quantidades de technician_items:', e.message);
  }

  // 3. Monta a lista final: todas as peças do subgrupo com qty do Databricks quando disponível
  const items = subgroupItems.map(item => ({
    item_code:     item.item_code,
    item_name:     item.item_name,
    unit:          item.unit || 'UN',
    item_subgroup: item.item_subgroup || item.subgroup || scheduledSubgroup,
    item_quantity: databricksQtyMap[item.item_code] !== undefined
      ? databricksQtyMap[item.item_code]
      : (Number(item.item_quantity) || 0),
  }));

  // Cria o inventário
  const { data: inventory, error: invError } = await supabase
    .from('inventories')
    .insert({
      technician_id: technician.id,
      week_ref: weekRef,
      status: 'in_progress',
      total_items: items.length,
      counted_items: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }

  // Insere as peças selecionadas no inventário
  const inventoryItems = items.map(item => ({
    inventory_id: inventory.id,
    item_code: item.item_code,
    item_name: item.item_name,
    item_subgroup: item.item_subgroup || null,
    system_qty: Number(item.item_quantity) || 0,
    physical_qty: null,
    status: 'pending',
  }));

  const { error: itemsError } = await supabase
    .from('inventory_items')
    .insert(inventoryItems);

  if (itemsError) {
    await supabase.from('inventories').delete().eq('id', inventory.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  // Vincula o inventory_id ao agendamento (status já foi para 'dispatched' no claim acima)
  await supabase
    .from('inventory_schedules')
    .update({ inventory_id: inventory.id, updated_at: new Date().toISOString() })
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

  // Monta e envia a primeira mensagem via GPT Maker
  const firstName = technician.name.split(' ')[0];
  const subgroupLabel = scheduledSubgroup ? ` — subgrupo *${scheduledSubgroup}*` : '';
  const firstMessage =
    `Olá, ${firstName}! 👋\n\n` +
    `É hora do inventário semanal — semana *${weekRef}*${subgroupLabel}.\n\n` +
    `Vamos contar *${items.length} peça(s)*. Responda apenas com o número de cada uma.\n\n` +
    `📦 *Peça 1 de ${items.length}*\n` +
    `*${firstItem.item_name}*\n` +
    `Código: \`${firstItem.item_code}\`\n` +
    `Quantidade esperada: *${Number(firstItem.item_quantity) || 0}*\n\n` +
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
    week_ref: weekRef,
    subgroup: scheduledSubgroup,
    items_count: items.length,
    qty_source: databricksSource ? 'databricks' : 'technician_items',
    dispatched,
    dispatch_error: dispatchError,
  });
}
