import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Início do dia de hoje (horário de Brasília → UTC)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Busca agendamentos cuja data já passou e ainda não foram concluídos/abandonados
  const { data: overdueSchedules, error } = await supabase
    .from('inventory_schedules')
    .select('id, inventory_id, technician_id, scheduled_at, technicians(name)')
    .lt('scheduled_at', startOfToday.toISOString())
    .not('status', 'in', '("completed","abandoned","cancelled")');

  if (error) {
    console.error('[check-abandoned]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const sched of (overdueSchedules || [])) {
    const techName   = sched.technicians?.name || 'Técnico';
    const dataAgend  = new Date(sched.scheduled_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Se tem inventário vinculado, verifica se já foi concluído
    if (sched.inventory_id) {
      const { data: inv } = await supabase
        .from('inventories')
        .select('status')
        .eq('id', sched.inventory_id)
        .maybeSingle();

      if (inv && ['completed', 'abandoned'].includes(inv.status)) continue;

      if (inv) {
        await supabase
          .from('inventories')
          .update({ status: 'abandoned', updated_at: now.toISOString() })
          .eq('id', sched.inventory_id);
      }
    }

    // Marca agendamento como abandonado
    await supabase
      .from('inventory_schedules')
      .update({ status: 'abandoned', updated_at: now.toISOString() })
      .eq('id', sched.id);

    // Cria alerta para o supervisor
    await supabase.from('alerts').insert({
      type:          'abandonment',
      severity:      'high',
      title:         `Inventário não realizado — ${techName}`,
      description:   `Inventário agendado para ${dataAgend} não foi realizado e foi marcado como abandonado.`,
      technician_id: sched.technician_id || null,
      inventory_id:  sched.inventory_id  || null,
      resolved:      false,
      created_at:    now.toISOString(),
    });

    results.push({ schedule_id: sched.id, technician: techName, scheduled_at: sched.scheduled_at, action: 'abandoned' });
  }

  return NextResponse.json({
    ok:        true,
    processed: results.length,
    results,
  });
}
