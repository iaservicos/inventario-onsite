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

    // Define o período de busca: hoje
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Busca agendamentos PENDENTES que estão no horário de agora (ou que já passaram e não foram disparados)
    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select(`
        id,
        scheduled_at,
        scheduled_subgroup,
        technicians (
          id,
          name,
          phone
        )
      `)
      .eq('status', 'pending')
      .gte('scheduled_at', startOfDay.toISOString())
      .lte('scheduled_at', endOfDay.toISOString());

    if (error) throw error;

    // Filtra apenas os que já chegaram no horário de disparo
    const currentSchedules = (schedules || []).filter(s => new Date(s.scheduled_at) <= now);

    // Retorna a lista completa para o Power Automate
    const schedulesToDispatch = currentSchedules.map(s => ({
      schedule_id: s.id,
      nome: s.technicians.name,
      telefone: s.technicians.phone,
      subgrupo: s.scheduled_subgroup || 'Geral'
    }));

    return NextResponse.json({ 
      count: schedulesToDispatch.length,
      content: schedulesToDispatch 
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
