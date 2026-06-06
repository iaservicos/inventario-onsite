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

    const { searchParams } = new URL(req.url);
    const diaParam = searchParams.get('dia'); // 'hoje' gera para hoje; padrão = amanhã

    // 1. Descobre o dia alvo no horário de Brasília (UTC-3)
    const agora = new Date();
    const agoraSP = new Date(agora.getTime() - 3 * 60 * 60 * 1000);

    const alvoDiaSP = new Date(agoraSP);
    if (diaParam !== 'hoje') {
      alvoDiaSP.setUTCDate(alvoDiaSP.getUTCDate() + 1); // padrão: amanhã
    }

    const diaAlvo = alvoDiaSP.getUTCDay(); // 0=Dom … 6=Sáb

    // 00:00 SP = 03:00 UTC do mesmo dia calendário
    const amanhaInicio = new Date(Date.UTC(
      alvoDiaSP.getUTCFullYear(), alvoDiaSP.getUTCMonth(), alvoDiaSP.getUTCDate(),
      3, 0, 0, 0,
    ));
    const amanhaFim = new Date(amanhaInicio.getTime() + 24 * 60 * 60 * 1000 - 1);

    // Base de data (meia-noite UTC do dia alvo SP) usada para montar scheduled_at
    const amanha = new Date(Date.UTC(
      alvoDiaSP.getUTCFullYear(), alvoDiaSP.getUTCMonth(), alvoDiaSP.getUTCDate(),
      0, 0, 0, 0,
    ));

    // 2. Busca técnicos que fazem inventário amanhã
    const { data: tecnicos } = await supabase
      .from('technicians')
      .select('*')
      .eq('inventory_day', diaAlvo)
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
        .select('id, inventory_id, scheduled_subgroup, scheduled_at')
        .eq('technician_id', tech.id)
        .gte('scheduled_at', amanhaInicio.toISOString())
        .lte('scheduled_at', amanhaFim.toISOString())
        .maybeSingle();

      if (existente) {
        // Calcula o scheduled_at correto (SP → UTC)
        const [h, m] = (tech.inventory_time || '08:00').split(':').map(Number);
        const scheduledCorreto = new Date(amanha);
        scheduledCorreto.setUTCHours(h + 3, m, 0, 0);

        const updates = {};

        // Corrige horário se mudou
        if (existente.scheduled_at !== scheduledCorreto.toISOString()) {
          updates.scheduled_at = scheduledCorreto.toISOString();
        }

        // Sempre reconfirma o subgrupo com base no saldo atual — papel central do D-1
        // (função é determinística: mesmo saldo → mesmo subgrupo, sem risco de flip)
        const subgrupoAtual = await getSubgroupForTechnician(supabase, tech.id, weekSubgroup);
        if (subgrupoAtual && subgrupoAtual !== existente.scheduled_subgroup) {
          updates.scheduled_subgroup = subgrupoAtual;
        }

        // Vincula inventário se ainda não foi vinculado
        if (!existente.inventory_id) {
          const { data: inv } = await supabase
            .from('inventories')
            .insert({ technician_id: tech.id, status: 'pending', week_ref: weekRef })
            .select('id')
            .single();
          if (inv) updates.inventory_id = inv.id;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('inventory_schedules').update(updates).eq('id', existente.id);
        }

        const subgrupoFinal = updates.scheduled_subgroup || existente.scheduled_subgroup || 'Geral';
        respostaPowerAutomate.push({
          nome:     tech.name,
          telefone: tech.phone,
          subgrupo: subgrupoFinal,
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