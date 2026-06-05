import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems, getSubgroupForTechnician } from '@/lib/db';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

function getWeekRef(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServiceClient();

    // 1. Descobre que dia é amanhã (0-6)
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(hoje.getDate() + 1);
    
    // --- AJUSTE DE HORÁRIO ---
    // Fixamos o horário para as 08:00 da manhã. 
    // Assim, o inventário estará "pronto" para o Power Automate a partir desse horário.
    // Se deixarmos o horário da execução (ex: 20:00), o técnico só receberia a mensagem às 20:00 do dia seguinte.
    amanha.setHours(8, 0, 0, 0); 
    
    const diaAmanha = amanha.getDay();

    // Define o range de amanhã para a verificação de duplicidade (00:00 até 23:59)
    const amanhaInicio = new Date(amanha);
    amanhaInicio.setHours(0, 0, 0, 0);
    const amanhaFim = new Date(amanha);
    amanhaFim.setHours(23, 59, 59, 999);

    // 2. Busca técnicos que fazem inventário amanhã
    const { data: tecnicos } = await supabase
      .from('technicians')
      .select('*')
      .eq('inventory_day', diaAmanha)
      .eq('active', true);

    if (!tecnicos || tecnicos.length === 0) return NextResponse.json({ content: [] });

    const weekSubgroup = await getWeekSubgroup(supabase);
    const respostaPowerAutomate = [];

    for (const tech of tecnicos) {
      // Selects the best subgroup for this technician: default week subgroup if they
      // have items there, otherwise the next unused subgroup, cycling when all used.
      const subgrupo = await getSubgroupForTechnician(supabase, tech.id, weekSubgroup);
      const pecas = await getConsolidatedTechnicianItems(supabase, tech.id, subgrupo);
      if (pecas.length === 0) continue;

      const dadosAgendamento = {
        technician_id: tech.id,
        scheduled_at: amanha.toISOString(),
        status: 'pending',
        scheduled_subgroup: subgrupo || 'Geral',
        scheduled_items: pecas,
        week_ref: getWeekRef(amanha)
      };

      const { data: existente } = await supabase
        .from('inventory_schedules')
        .select('id, inventory_id')
        .eq('technician_id', tech.id)
        .gte('scheduled_at', amanhaInicio.toISOString())
        .lte('scheduled_at', amanhaFim.toISOString())
        .maybeSingle();

      if (existente) {
        await supabase
          .from('inventory_schedules')
          .update(dadosAgendamento)
          .eq('id', existente.id);

        if (!existente.inventory_id) {
          const { data: inv } = await supabase
            .from('inventories')
            .insert({ technician_id: tech.id, status: 'pending', week_ref: dadosAgendamento.week_ref })
            .select('id')
            .single();
          if (inv) {
            await supabase.from('inventory_schedules').update({ inventory_id: inv.id }).eq('id', existente.id);
          }
        }
      } else {
        const { data: inv } = await supabase
          .from('inventories')
          .insert({ technician_id: tech.id, status: 'pending', week_ref: dadosAgendamento.week_ref })
          .select('id')
          .single();

        await supabase
          .from('inventory_schedules')
          .insert({ ...dadosAgendamento, inventory_id: inv?.id || null });
      }

      respostaPowerAutomate.push({
        nome: tech.name,
        telefone: tech.phone,
        subgrupo: subgrupo || 'Geral',
      });
    }

    return NextResponse.json({ content: respostaPowerAutomate });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}