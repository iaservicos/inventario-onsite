import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Define o período de busca: desde o início do dia até agora + 15 minutos
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const fifteenMinutesFromNow = new Date(now.getTime() + (15 * 60 * 1000));

    // Busca agendamentos PENDENTES que estão no horário de agora
    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select('id, technician_id, scheduled_at')
      .eq('status', 'pending')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', fifteenMinutesFromNow.toISOString());

    if (error) throw error;

    // Retorna a lista de IDs para o Power Automate processar
    const schedulesToDispatch = (schedules || []).map(s => ({ 
      schedule_id: s.id 
    }));

    return NextResponse.json(schedulesToDispatch);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
