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

  try {
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

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      console.error('[alert-d1] Erro GPT Maker:', res.status, errorData);
      return { ok: false, error: errorData.message || `Status ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    console.error('[alert-d1] Erro fetch GPT Maker:', err);
    return { ok: false, error: err.message };
  }
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
    // Não bloqueia se não houver subgrupo, apenas envia sem o foco
    const subgroupLabel = weekSubgroup ? `\n\nPor favor, separe as peças do subgrupo: *${weekSubgroup}*` : '';

    // Busca agendamentos que ocorrerão nas próximas 24 a 48 horas (Janela D-1 flexível)
    const now = new Date();
    
    // Início da busca: daqui a 18 horas
    // Fim da busca: daqui a 42 horas
    // Isso cobre o dia de amanhã independentemente do horário que o script rodar
    const searchStart = new Date(now.getTime() + (18 * 60 * 60 * 1000));
    const searchEnd = new Date(now.getTime() + (42 * 60 * 60 * 1000));

    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*)')
      .eq('status', 'pending')
      .gte('scheduled_at', searchStart.toISOString())
      .lte('scheduled_at', searchEnd.toISOString());

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        sent: 0, 
        message: 'Nenhum agendamento para amanhã',
        debug: {
          now_utc: now.toISOString(),
          search_start_utc: searchStart.toISOString(),
          search_end_utc: searchEnd.toISOString()
        }
      });
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
        `Amanhã é dia do seu inventário semanal.${subgroupLabel}\n\n` +
        `Amanhã você receberá a lista completa para contagem. Qualquer dúvida, fale com seu supervisor.`;

      const sendResult = await sendGptMakerMessage(tech.phone, message);
      results.push({ 
        technician_id: schedule.technician_id, 
        name: tech.name, 
        ok: sendResult.ok,
        error: sendResult.error 
      });
    }

    return NextResponse.json({ ok: true, subgroup: weekSubgroup, sent: results.filter(r => r.ok).length, results });
  } catch (err) {
    console.error('[alert-d1]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
