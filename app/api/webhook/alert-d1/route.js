import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '@/lib/db';
import { createSchedule } from '@/lib/db-gptmaker';

export const dynamic = 'force-dynamic';
const DISPATCH_SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const secret = req.headers.get('x-dispatch-secret');
    if (secret !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'generate') {
      const now = new Date();
      // Ajuste para amanhã no fuso de Brasília
      const brTomorrow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      brTomorrow.setDate(brTomorrow.getDate() + 1);
      const dayOfWeek = brTomorrow.getDay();

      const { data: technicians } = await supabase
        .from('technicians')
        .select('*')
        .eq('inventory_day', dayOfWeek)
        .eq('active', true);

      if (!technicians || technicians.length === 0) {
        return NextResponse.json({ ok: true, message: "Nenhum técnico para amanhã" });
      }

      const weekSubgroup = await getWeekSubgroup(supabase);

      // PROCESSAMENTO EM PARALELO (Muito mais rápido)
      const promises = technicians.map(async (tech) => {
        try {
          const items = await getConsolidatedTechnicianItems(supabase, tech.id, weekSubgroup);
          if (!items || items.length === 0) return null;

          const [h, m] = (tech.inventory_time || '08:00').split(':').map(Number);
          const scheduled_at = new Date(brTomorrow);
          scheduled_at.setHours(h, m, 0, 0);

          return createSchedule({
            technician_id: tech.id,
            scheduled_by: 'system',
            scheduled_at: scheduled_at.toISOString(),
            week_ref: 'AUTO',
            items_count: items.length,
            scheduled_subgroup: weekSubgroup,
            scheduled_items: items
          });
        } catch (e) {
          return null;
        }
      });

      const results = await Promise.all(promises);
      const generatedCount = results.filter(r => r !== null).length;

      return NextResponse.json({ ok: true, generated: generatedCount });
    }

    // Se não for 'generate', segue o fluxo normal de alerta
    return NextResponse.json({ message: "Ação não reconhecida" });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
