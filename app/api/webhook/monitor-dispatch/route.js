import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = createServiceClient();
    const now = new Date();

    // --- DIAGNÓSTICO: BUSCA TUDO QUE É PENDENTE ---
    // Vamos ignorar a data por um momento para ver o que existe no banco
    const { data: allPending, error: debugError } = await supabase
      .from('inventory_schedules')
      .select('id, scheduled_at, status, technician_id')
      .eq('status', 'pending');

    // ----------------------------------------------

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select(`
        id, scheduled_at, scheduled_subgroup,
        technicians ( id, name, phone )
      `)
      .eq('status', 'pending')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString());

    return NextResponse.json({ 
      success: true,
      debug: {
        total_pending_no_date_filter: allPending?.length || 0,
        all_pending_dates: allPending?.map(s => s.scheduled_at) || [],
        server_now: now.toISOString(),
        filter_start: startOfDay.toISOString(),
        filter_end: endOfDay.toISOString()
      },
      count: (schedules || []).length,
      content: (schedules || []).map(s => ({
        schedule_id: s.id,
        nome: s.technicians?.name,
        telefone: s.technicians?.phone,
        horario: s.scheduled_at
      }))
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
