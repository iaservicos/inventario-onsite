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

    // 1. Define o período de busca: O DIA TODO DE HOJE
    // Usamos o início e o fim do dia para não ter erro de fuso horário
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    console.log(`Buscando agendamentos entre ${startOfDay.toISOString()} e ${endOfDay.toISOString()}`);

    // 2. Busca agendamentos PENDENTES para hoje
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

    // 3. Filtro de segurança:
    // Se você quer que o Power Automate pegue APENAS o que já deu o horário, mantemos o filtro abaixo.
    // Se quiser que ele pegue TUDO de hoje para disparar de uma vez, podemos remover o filtro.
    // Vou deixar o filtro, mas com uma tolerância de 5 minutos para evitar problemas de sincronia.
    
    const tolerance = 5 * 60 * 1000; // 5 minutos em milissegundos
    const currentSchedules = (schedules || []).filter(s => {
      const scheduleTime = new Date(s.scheduled_at);
      return scheduleTime.getTime() <= (now.getTime() + tolerance);
    });

    const schedulesToDispatch = currentSchedules.map(s => ({
      schedule_id: s.id,
      nome: s.technicians?.name || 'Técnico',
      telefone: s.technicians?.phone || '',
      subgrupo: s.scheduled_subgroup || 'Geral',
      horario_agendado: s.scheduled_at // Adicionado para conferência
    }));

    return NextResponse.json({ 
      success: true,
      count: schedulesToDispatch.length,
      now: now.toISOString(),
      content: schedulesToDispatch 
    });

  } catch (err) {
    console.error('Monitor Dispatch Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
