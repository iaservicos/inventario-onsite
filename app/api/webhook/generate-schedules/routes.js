import { NextResponse } from 'next/server';
import { createServiceClient } from '../../../lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '../../../lib/db';
import { createSchedule } from '../../../lib/db-gptmaker';


export const dynamic = 'force-dynamic';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const secret = req.headers.get('x-dispatch-secret');
    if (secret !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // 1. Pega a data de amanhã
    const now = new Date();
    const brNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const brTomorrow = new Date(brNow);
    brTomorrow.setDate(brNow.getDate() + 1);
    const dayOfWeek = brTomorrow.getDay();

    // 2. Busca técnicos do dia
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('*')
      .eq('inventory_day', dayOfWeek)
      .eq('active', true);

    if (techError) throw techError;
    if (!technicians || technicians.length === 0) {
      return NextResponse.json({ message: 'Nenhum técnico para amanhã.' });
    }

    const weekSubgroup = await getWeekSubgroup(supabase);
    const generatedSchedules = [];

    for (const tech of technicians) {
      try {
        const consolidatedItems = await getConsolidatedTechnicianItems(supabase, tech.id, weekSubgroup);
        if (consolidatedItems.length === 0) continue;

        const [hour, minute] = (tech.inventory_time || '08:00').split(':').map(Number);
        const scheduled_at = new Date(brTomorrow);
        scheduled_at.setHours(hour, minute, 0, 0);

        const newSchedule = await createSchedule({
          technician_id: tech.id,
          scheduled_by: 'system',
          scheduled_at: scheduled_at.toISOString(),
          week_ref: `${brTomorrow.getFullYear()}-W${Math.ceil((brTomorrow.getTime() - new Date(brTomorrow.getFullYear(), 0, 1).getTime()) / (86400000 * 7))}`,
          items_count: consolidatedItems.length,
          notes: 'Agendamento automático',
          scheduled_subgroup: weekSubgroup,
          scheduled_items: consolidatedItems,
        });
        generatedSchedules.push(newSchedule);
      } catch (err) {
        console.error(err);
      }
    }

    return NextResponse.json({ ok: true, generated: generatedSchedules.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
