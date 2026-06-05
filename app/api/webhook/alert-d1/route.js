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
    amanha.setUTCDate(amanha.getUTCDate() + 1);
    amanha.setUTCHours(0, 0, 0, 0); // data base limpa em UTC

    // day-of-week em SP (UTC-3): offset de 3h
    const amanhaEmSP = new Date(amanha.getTime() - 3 * 60 * 60 * 1000);
    const diaAmanha  = amanhaEmSP.getUTCDay();

    // Range do dia de amanhã em SP (UTC-3): 00:00 SP = 03:00 UTC
    const amanhaInicio = new Date(amanha);
    amanhaInicio.setUTCHours(3, 0, 0, 0);
    const amanhaFim = new Date(amanha);
    amanhaFim.setUTCHours(26, 59, 59, 999); // overflow automático → 02:59 UTC do dia seguinte

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
      const weekRef = getWeekRef(amanha);

      // Verifica PRIMEIRO se já existe agendamento para amanhã.
      // Se existir, não recalcula o subgrupo (evita trocar lcd→ssd em execuções repetidas do cron).
      const { data: existente } = await supabase
        .from('inventory_schedules')
        .select('id, inventory_id, scheduled_subgroup')
        .eq('technician_id', tech.id)
        .gte('scheduled_at', amanhaInicio.toISOString())
        .lte('scheduled_at', amanhaFim.toISOString())
        .maybeSingle();

      if (existente) {
        // Agendamento já criado — só garante que o inventário está vinculado
        if (!existente.inventory_id) {
          const { data: inv } = await supabase
            .from('inventories')
            .insert({ technician_id: tech.id, status: 'pending', week_ref: weekRef })
            .select('id')
            .single();
          if (inv) {
            await supabase.from('inventory_schedules').update({ inventory_id: inv.id }).eq('id', existente.id);
          }
        }
        respostaPowerAutomate.push({
          nome: tech.name,
          telefone: tech.phone,
          subgrupo: existente.scheduled_subgroup || 'Geral',
        });
        continue;
      }

      // Nenhum agendamento existe ainda — calcula subgrupo e cria
      const subgrupo = await getSubgroupForTechnician(supabase, tech.id, weekSubgroup);
      const pecas = await getConsolidatedTechnicianItems(supabase, tech.id, subgrupo);
      if (pecas.length === 0) continue;

      // Horário do técnico em SP (UTC-3) → converte para UTC somando 3h
      const [h, m] = (tech.inventory_time || '08:00').split(':').map(Number);
      const agendar = new Date(amanha);
      agendar.setUTCHours(h + 3, m, 0, 0);

      const { data: inv } = await supabase
        .from('inventories')
        .insert({ technician_id: tech.id, status: 'pending', week_ref: weekRef })
        .select('id')
        .single();

      await supabase.from('inventory_schedules').insert({
        technician_id:      tech.id,
        scheduled_at:       agendar.toISOString(),
        status:             'pending',
        scheduled_subgroup: subgrupo || 'Geral',
        scheduled_items:    pecas,
        items_count:        pecas.length,
        week_ref:           weekRef,
        inventory_id:       inv?.id || null,
      });

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