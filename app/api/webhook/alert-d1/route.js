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
    return { ok: false, error: 'Configuração ausente' };
  }

  try {
    // URL correta para a v2 do GPT Maker enviando via agente específico
    const url = `https://api.gptmaker.ai/v2/agent/${GPTMAKER_AGENT_ID}/message/send`;
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GPTMAKER_TOKEN}`,
      },
      body: JSON.stringify({
        phone,
        text: message,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.message || data.error || `Status ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
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

    // Busca agendamentos para o dia civil de amanhã (Brasília GMT-3)
    const now = new Date();
    // Ajusta para Brasília
    const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    
    // Define o dia de amanhã
    const brTomorrow = new Date(brNow);
    brTomorrow.setDate(brNow.getDate() + 1);
    
    // Início e fim do dia de amanhã em Brasília
    const startOfTomorrow = new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 0, 0, 0);
    const endOfTomorrow = new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 23, 59, 59);
    
    // Converte para UTC para a query no Supabase
    const searchStart = new Date(startOfTomorrow.getTime() + (3 * 60 * 60 * 1000));
    const searchEnd = new Date(endOfTomorrow.getTime() + (3 * 60 * 60 * 1000));

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
