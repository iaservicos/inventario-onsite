import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Busca agendamentos para o dia civil de amanhã (Brasília GMT-3)
    const now = new Date();
    const brNow = new Date(now.getTime() - (3 * 60 * 60 * 1000));
    const brTomorrow = new Date(brNow);
    brTomorrow.setDate(brNow.getDate() + 1);
    
    const startOfTomorrow = new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 0, 0, 0);
    const endOfTomorrow = new Date(brTomorrow.getFullYear(), brTomorrow.getMonth(), brTomorrow.getDate(), 23, 59, 59);
    
    const searchStart = new Date(startOfTomorrow.getTime() + (3 * 60 * 60 * 1000));
    const searchEnd = new Date(endOfTomorrow.getTime() + (3 * 60 * 60 * 1000));

    const { data: schedules, error } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*), scheduled_subgroup, scheduled_items')
      .eq('status', 'pending')
      .gte('scheduled_at', searchStart.toISOString())
      .lte('scheduled_at', searchEnd.toISOString());

    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    const techniciansToAlert = (schedules || []).map(s => ({
      technician_id: s.technician_id,
      name: s.technicians?.name,
      phone: s.technicians?.phone,
      scheduled_at: s.scheduled_at,
      subgroup: s.scheduled_subgroup,
      message: `Olá, ${s.technicians?.name}! 👋\n\nAmanhã é dia do seu inventário semanal.${s.scheduled_subgroup ? `\n\nFoco da semana: *${s.scheduled_subgroup}*` : ''}\n\nQualquer dúvida, fale com seu supervisor.`
    })).filter(t => t.phone);

    return NextResponse.json({ 
      ok: true, 
      count: techniciansToAlert.length,
      technicians: techniciansToAlert 
    });
  } catch (err) {
    console.error('[alert-d1]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
