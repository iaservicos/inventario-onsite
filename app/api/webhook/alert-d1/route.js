import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '@/lib/db';
import { createSchedule } from '@/lib/db-gptmaker';

export const dynamic = 'force-dynamic';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function GET() {
  return NextResponse.json({ message: "API Alerta D-1 Ativa" });
}

export async function POST(req) {
  try {
    const secret = req.headers.get('x-dispatch-secret');
    if (secret !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // SE A AÇÃO FOR GERAR AGENDAMENTOS
    if (action === 'generate') {
      const now = new Date();
      const brTomorrow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
      brTomorrow.setDate(brTomorrow.getDate() + 1);
      const dayOfWeek = brTomorrow.getDay();

      const { data: technicians } = await supabase
        .from('technicians')
        .select('*')
        .eq('inventory_day', dayOfWeek)
        .eq('active', true);

      const weekSubgroup = await getWeekSubgroup(supabase);
      const generated = [];

      for (const tech of technicians) {
        const items = await getConsolidatedTechnicianItems(supabase, tech.id, weekSubgroup);
        if (items.length === 0) continue;

        const [h, m] = (tech.inventory_time || '08:00').split(':').map(Number);
        const scheduled_at = new Date(brTomorrow);
        scheduled_at.setHours(h, m, 0, 0);

        const s = await createSchedule({
          technician_id: tech.id,
          scheduled_by: 'system',
          scheduled_at: scheduled_at.toISOString(),
          week_ref: 'AUTO',
          items_count: items.length,
          scheduled_subgroup: weekSubgroup,
          scheduled_items: items
        });
        generated.push(s);
      }
      return NextResponse.json({ ok: true, generated: generated.length });
    }

    // LÓGICA NORMAL DE ALERTA D-1 (Se não houver action=generate)
    // ... (seu código de alerta aqui)
    return NextResponse.json({ message: "Alerta enviado" });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
