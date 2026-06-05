import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ABANDONED_AFTER_HOURS = 4;
const RENOTIFY_AFTER_HOURS = 8;
const GPTMAKER_API_URL = 'https://api.gptmaker.ai/v2/send-message';

export async function GET(request) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const abandonedThreshold = new Date(now.getTime() - ABANDONED_AFTER_HOURS * 60 * 60 * 1000);
  const renotifyThreshold = new Date(now.getTime() - RENOTIFY_AFTER_HOURS * 60 * 60 * 1000);

  const { data: sessions, error } = await supabase
    .from('gptmaker_sessions')
    .select(`
      id,
      inventory_id,
      schedule_id,
      technician_id,
      phone,
      technician_phone,
      technician_name,
      session_token,
      last_message_at,
      renotified_at,
      renotify_count,
      inventories (
        id,
        status,
        counted_items,
        total_items
      )
    `)
    .eq('status', 'active')
    .lt('last_message_at', abandonedThreshold.toISOString());

  if (error) {
    console.error('[check-abandoned] Erro ao buscar sessões:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!sessions || sessions.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'Nenhuma sessão abandonada encontrada.' });
  }

  const results = [];

  for (const session of sessions) {
    const lastActivity = new Date(session.last_message_at);
    const hoursInactive = ((now - lastActivity) / 1000 / 60 / 60).toFixed(1);
    const alreadyRenotified = session.renotify_count > 0;
    const renotifyAllowed = !session.renotified_at || new Date(session.renotified_at) < renotifyThreshold;

    if (!alreadyRenotified && renotifyAllowed) {
      const renotifyResult = await renotifyTechnician(session, hoursInactive);
      results.push({ session_id: session.id, action: 'renotified', ...renotifyResult });

      await supabase
        .from('gptmaker_sessions')
        .update({
          renotified_at: now.toISOString(),
          renotify_count: (session.renotify_count || 0) + 1,
        })
        .eq('id', session.id);

      await createAbandonedAlert(session, hoursInactive, 'renotified');

    } else if (alreadyRenotified && renotifyAllowed) {
      await supabase
        .from('gptmaker_sessions')
        .update({ status: 'abandoned' })
        .eq('id', session.id);

      await supabase
        .from('inventories')
        .update({ status: 'abandoned' })
        .eq('id', session.inventory_id);

      await supabase
        .from('inventory_schedules')
        .update({ status: 'abandoned' })
        .eq('id', session.schedule_id);

      await createAbandonedAlert(session, hoursInactive, 'abandoned');

      await notifySupervisor(session, hoursInactive);

      results.push({ session_id: session.id, action: 'marked_abandoned', technician: session.technician_name });
    } else {
      results.push({ session_id: session.id, action: 'skipped', reason: 'Renotificação muito recente' });
    }
  }

  return NextResponse.json({ ok: true, processed: sessions.length, results });
}

async function renotifyTechnician(session, hoursInactive) {
  const progress = session.inventories
    ? `${session.inventories.counted_items || 0} de ${session.inventories.total_items || '?'} peças contadas`
    : 'inventário em andamento';

  const message =
    `Olá, ${session.technician_name}! 👋\n\n` +
    `Seu inventário está aguardando há ${hoursInactive} horas.\n` +
    `Progresso atual: ${progress}.\n\n` +
    `Por favor, retome a contagem respondendo com a quantidade da próxima peça. ` +
    `Caso não possa continuar agora, informe "cancelar" para que o supervisor seja notificado.`;

  if (!process.env.GPTMAKER_API_TOKEN) {
    return { ok: false, reason: 'GPTMAKER_API_TOKEN não configurado — mensagem não enviada' };
  }

  const phone = session.technician_phone || session.phone;

  try {
    const res = await fetch(GPTMAKER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GPTMAKER_API_TOKEN}`,
      },
      body: JSON.stringify({
        phone,
        message,
        custom_fields: {
          session_token: session.session_token,
        },
      }),
    });

    if (res.ok) {
      return { ok: true, phone };
    } else {
      const err = await res.text();
      return { ok: false, reason: err };
    }
  } catch (e) {
    return { ok: false, reason: e.message };
  }
}

async function notifySupervisor(session, hoursInactive) {
  if (!process.env.GPTMAKER_SUPERVISOR_PHONE || !process.env.GPTMAKER_API_TOKEN) return;

  const message =
    `⚠️ Inventário abandonado\n\n` +
    `Técnico: ${session.technician_name}\n` +
    `Telefone: ${session.technician_phone}\n` +
    `Inativo há: ${hoursInactive} horas\n\n` +
    `O inventário foi marcado como abandonado no sistema. ` +
    `Acesse o dashboard para reagendar ou tomar providências.`;

  try {
    await fetch(GPTMAKER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GPTMAKER_API_TOKEN}`,
      },
      body: JSON.stringify({
        phone: process.env.GPTMAKER_SUPERVISOR_PHONE,
        message,
      }),
    });
  } catch (e) {
    console.error('[check-abandoned] Erro ao notificar supervisor:', e.message);
  }
}

async function createAbandonedAlert(session, hoursInactive, type) {
  const title = type === 'abandoned'
    ? `Inventário abandonado — ${session.technician_name}`
    : `Técnico sem resposta — ${session.technician_name}`;

  const description = type === 'abandoned'
    ? `O técnico ${session.technician_name} não respondeu após renotificação. Inventário marcado como abandonado após ${hoursInactive}h de inatividade.`
    : `O técnico ${session.technician_name} está sem responder há ${hoursInactive}h. Uma renotificação foi enviada via WhatsApp.`;

  await supabase.from('alerts').insert({
    type: 'abandonment',
    severity: type === 'abandoned' ? 'high' : 'medium',
    title,
    description,
    technician_id: session.technician_id || null,
    inventory_id: session.inventory_id || null,
    resolved: false,
    created_at: new Date().toISOString(),
  });
}
