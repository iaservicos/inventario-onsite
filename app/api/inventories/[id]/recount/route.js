import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const GPTMAKER_API_URL = 'https://api.gptmaker.ai/v2/send-message';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const originalInventoryId = parseInt(params.id);

  const { data: original, error: origError } = await supabase
    .from('inventories')
    .select(`
      id,
      technician_id,
      week_ref,
      status,
      technicians (
        id,
        name,
        phone
      ),
      inventory_items (
        id,
        item_code,
        item_name,
        unit,
        expected_qty,
        counted_qty,
        status
      )
    `)
    .eq('id', originalInventoryId)
    .single();

  if (origError || !original) {
    return NextResponse.json({ error: 'Inventário não encontrado' }, { status: 404 });
  }

  if (!['completed', 'recount_pending'].includes(original.status)) {
    return NextResponse.json({
      error: 'Recontagem só pode ser criada para inventários com status completed ou recount_pending'
    }, { status: 400 });
  }

  const divergentItems = (original.inventory_items || []).filter(
    (item) => item.status === 'divergent' || item.status === 'recount'
  );

  if (divergentItems.length === 0) {
    return NextResponse.json({ error: 'Nenhuma peça divergente encontrada neste inventário' }, { status: 400 });
  }

  const { data: newInventory, error: invError } = await supabase
    .from('inventories')
    .insert({
      technician_id: original.technician_id,
      week_ref: original.week_ref,
      status: 'in_progress',
      items_total: divergentItems.length,
      items_counted: 0,
      recount_of: originalInventoryId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (invError) {
    return NextResponse.json({ error: invError.message }, { status: 500 });
  }

  const newItems = divergentItems.map((item, index) => ({
    inventory_id: newInventory.id,
    item_code: item.item_code,
    item_name: item.item_name,
    unit: item.unit,
    expected_qty: item.counted_qty ?? item.expected_qty,
    counted_qty: null,
    status: 'pending',
    sort_order: index,
    created_at: new Date().toISOString(),
  }));

  const { error: itemsError } = await supabase
    .from('inventory_items')
    .insert(newItems);

  if (itemsError) {
    await supabase.from('inventories').delete().eq('id', newInventory.id);
    return NextResponse.json({ error: itemsError.message }, { status: 500 });
  }

  await supabase
    .from('inventories')
    .update({ status: 'recount_pending', updated_at: new Date().toISOString() })
    .eq('id', originalInventoryId);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const techName = original.technicians?.name || 'Técnico';
  const techPhone = original.technicians?.phone;

  const { data: gptSession, error: sessionError } = await supabase
    .from('gptmaker_sessions')
    .insert({
      inventory_id: newInventory.id,
      technician_id: original.technician_id,
      phone: techPhone || '',
      technician_phone: techPhone || '',
      technician_name: techName,
      session_token: sessionToken,
      current_item_index: 0,
      status: 'active',
      last_message_at: new Date().toISOString(),
      renotify_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (sessionError) {
    console.error('[recount] Erro ao criar sessão GPT Maker:', sessionError.message);
  }

  const firstItem = divergentItems[0];
  const firstMessage =
    `Olá, ${techName}! 👋\n\n` +
    `Identificamos uma divergência no seu inventário da semana ${original.week_ref}.\n\n` +
    `Precisamos recontar ${divergentItems.length} peça(s). Vamos começar:\n\n` +
    `📦 *${firstItem.item_name}* (${firstItem.item_code})\n` +
    `Quantidade anterior informada: ${firstItem.counted_qty ?? '—'}\n\n` +
    `Qual a quantidade atual em estoque? Responda apenas com o número.`;

  let dispatched = false;
  let dispatchError = null;

  if (techPhone && process.env.GPTMAKER_API_TOKEN) {
    try {
      const res = await fetch(GPTMAKER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.GPTMAKER_API_TOKEN}`,
        },
        body: JSON.stringify({
          phone: techPhone,
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
    dispatchError = !techPhone
      ? 'Técnico sem telefone cadastrado'
      : 'GPTMAKER_API_TOKEN não configurado';
  }

  await supabase.from('alerts').insert({
    type: 'recount',
    severity: 'medium',
    title: `Recontagem iniciada — ${techName}`,
    description: `Recontagem criada para ${divergentItems.length} peça(s) divergente(s) do inventário #${originalInventoryId}. ${dispatched ? 'Mensagem enviada ao técnico.' : 'Mensagem não enviada: ' + dispatchError}`,
    technician_id: original.technician_id,
    inventory_id: newInventory.id,
    resolved: false,
    created_at: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    recount_inventory_id: newInventory.id,
    items_to_recount: divergentItems.length,
    session_token: sessionToken,
    dispatched,
    dispatch_error: dispatchError,
    first_message: firstMessage,
  });
}
