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
 * Seleção inteligente de peças com prioridade por histórico de contagens.
 *
 * @param {Array} allItems - Todas as peças do técnico vindas do Databricks
 * @param {string} technicianId - ID do técnico no banco
 * @param {number} count - Quantidade de peças a selecionar (padrão: 10)
 * @returns {Array} Peças selecionadas com prioridade
 */
async function selectItemsWithPriority(allItems, technicianId, count = 10) {
  // Busca histórico de contagens do técnico (últimos 6 meses)
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { data: history } = await supabase
    .from('inventory_items')
    .select(`
      item_code,
      created_at,
      inventories!inner (
        technician_id,
        status,
        created_at
      )
    `)
    .eq('inventories.technician_id', technicianId)
    .in('inventories.status', ['completed', 'divergent'])
    .gte('inventories.created_at', sixMonthsAgo.toISOString())
    .order('created_at', { ascending: false });

  // Monta mapa: item_code → data da última contagem
  const lastCountedMap = {};
  if (history && history.length > 0) {
    for (const row of history) {
      const code = row.item_code;
      if (!lastCountedMap[code]) {
        lastCountedMap[code] = row.created_at;
      }
    }
  }

  // Classifica cada peça
  const neverCounted = [];   // Nunca contadas — máxima prioridade
  const countedOld = [];     // Contadas há mais de 4 semanas
  const countedRecent = [];  // Contadas recentemente (menos de 4 semanas)

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  for (const item of allItems) {
    const lastDate = lastCountedMap[item.item_code];

    if (!lastDate) {
      neverCounted.push(item);
    } else if (new Date(lastDate) < fourWeeksAgo) {
      countedOld.push({ ...item, last_counted: lastDate });
    } else {
      countedRecent.push({ ...item, last_counted: lastDate });
    }
  }

  // Ordena as contadas antigas da mais antiga para a mais recente
  countedOld.sort((a, b) => new Date(a.last_counted) - new Date(b.last_counted));

  // Embaralha as nunca contadas para variedade
  const shuffledNever = neverCounted.sort(() => Math.random() - 0.5);

  // Monta a lista final com prioridade
  const selected = [];

  // 1ª: Nunca contadas (até completar `count`)
  for (const item of shuffledNever) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'never_counted' });
  }

  // 2ª: Contadas mais antigas
  for (const item of countedOld) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'oldest_count' });
  }

  // 3ª: Contadas recentemente (completar se necessário)
  const shuffledRecent = countedRecent.sort(() => Math.random() - 0.5);
  for (const item of shuffledRecent) {
    if (selected.length >= count) break;
    selected.push({ ...item, selection_reason: 'recent_random' });
  }

  return selected.slice(0, count);
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

  // Busca TODAS as peças do técnico no Databricks
  let allItems;
  try {
    allItems = await getTechnicianItems(searchName);
  } catch (e) {
    await supabase
      .from('inventory_schedules')
      .update({
        status: 'cancelled',
        notes: `Erro Databricks: ${e.message}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', schedule_id);

    return NextResponse.json({
      error: `Erro ao buscar peças no Databricks: ${e.message}`,
      technician: technician.name,
      searched_as: searchName,
    }, { status: 500 });
  }

  if (!allItems || allItems.length === 0) {
    await supabase
      .from('inventory_schedules')
      .update({
        status: 'cancelled',
        notes: `Técnico "${searchName}" sem peças no Databricks`,
        updated_at: new Date().toISOString()
      })
      .eq('id', schedule_id);

    return NextResponse.json({
      error: `Nenhuma peça encontrada para "${searchName}" no Databricks`,
      hint: 'Verifique se o nome do técnico no sistema corresponde exatamente ao nome no Data Lake'
    }, { status: 404 });
  }

  // Seleção inteligente com prioridade por histórico
  const items = await selectItemsWithPriority(allItems, technician.id, totalItems);

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
  const inventoryItems = items.map((item, index) => ({
    inventory_id: inventory.id,
    item_code: item.item_code,
    item_name: item.item_name,
    unit: item.unit || 'UN',
    system_qty: Number(item.item_quantity) || 0,
    physical_qty: null,
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

  // Monta e envia a primeira mensagem via GPT Maker
  const firstName = technician.name.split(' ')[0];
  const firstMessage =
    `Olá, ${firstName}! 👋\n\n` +
    `É hora do inventário semanal — semana *${weekRef}*.\n\n` +
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
    databricks_name: searchName,
    week_ref: weekRef,
    total_in_databricks: allItems.length,
    items_count: items.length,
    items_selected: items.map(i => ({
      code: i.item_code,
      name: i.item_name,
      expected: Number(i.item_quantity) || 0,
      reason: i.selection_reason,
    })),
    dispatched,
    dispatch_error: dispatchError,
  });
}
