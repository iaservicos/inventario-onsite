import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';
const GPTMAKER_TOKEN = process.env.GPTMAKER_TOKEN || '';
const GPTMAKER_AGENT_ID = process.env.GPTMAKER_AGENT_ID || '';

// Retorna o subgrupo prioritário da semana atual
async function getWeekSubgroup(supabase) {
  const { data } = await supabase
    .from('v_current_week_subgroup')
    .select('subgroup_name')
    .maybeSingle();
  return data?.subgroup_name || null;
}

// Envia mensagem via GPT Maker API
async function sendGptMakerMessage(phone, message) {
  if (!GPTMAKER_TOKEN || !GPTMAKER_AGENT_ID) {
    console.warn('[alert-d1] GPTMAKER_TOKEN ou GPTMAKER_AGENT_ID não configurados');
    return false;
  }

  const res = await fetch(`https://api.gptmaker.ai/v2/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
    },
    body: JSON.stringify({
      phone,
      message,
      agent_id: GPTMAKER_AGENT_ID,
    }),
  });

  return res.ok;
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Busca o subgrupo da semana atual
    const weekSubgroup = await getWeekSubgroup(supabase);
    if (!weekSubgroup) {
      return NextResponse.json({ ok: false, error: 'Subgrupo da semana não encontrado' }, { status: 500 });
    }

    // Busca agendamentos de amanhã com status pending
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0]; // YYYY-MM-DD

    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*)')
      .eq('status', 'pending')
      .gte('scheduled_date', `${tomorrowStr}T00:00:00`)
      .lte('scheduled_date', `${tomorrowStr}T23:59:59`);

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ ok: true, sent: 0, message: 'Nenhum agendamento para amanhã' });
    }

    const results = [];
    for (const schedule of schedules) {
      const tech = schedule.technicians;
      if (!tech?.phone) {
        results.push({ technician_id: schedule.technician_id, ok: false, reason: 'sem_telefone' });
        continue;
      }

      const message =
        `Olá, ${tech.name}! 👋\n\n` +
        `Amanhã é dia do seu inventário semanal.\n\n` +
        `Por favor, separe as peças do subgrupo: *${weekSubgroup}*\n\n` +
        `Amanhã você receberá a lista completa para contagem. Qualquer dúvida, fale com seu supervisor.`;

      const sent = await sendGptMakerMessage(tech.phone, message);
      results.push({ technician_id: schedule.technician_id, name: tech.name, ok: sent });
    }

    return NextResponse.json({ ok: true, subgroup: weekSubgroup, sent: results.filter(r => r.ok).length, results });
  } catch (err) {
    console.error('[alert-d1]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
