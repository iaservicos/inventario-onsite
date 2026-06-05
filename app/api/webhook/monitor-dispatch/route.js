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

    // 1. Define o range de hoje para busca
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // 2. Busca agendamentos PENDENTES de hoje
    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select(`
        id, scheduled_at, scheduled_subgroup,
        technicians ( id, name, phone )
      `)
      .eq('status', 'pending')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString());

    if (error) throw error;

    const schedulesToDispatch = (schedules || []).map(s => ({
      schedule_id: String(s.id),
      nome: s.technicians?.name || 'Técnico',
      telefone: s.technicians?.phone || '',
      subgrupo: s.scheduled_subgroup || 'Geral'
    }));

    return NextResponse.json({ 
      success: true,
      count: schedulesToDispatch.length,
      content: schedulesToDispatch 
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
