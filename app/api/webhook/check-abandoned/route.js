import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();

  // Início do dia de hoje (horário de Brasília → UTC)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Busca agendamentos cuja data já passou e ainda não foram concluídos/abandonados
  // Nota: sem aspas nos valores — PostgREST não aceita quoted strings no filtro in()
  const { data: overdueSchedules, error } = await supabase
    .from('inventory_schedules')
    .select('id, inventory_id, technician_id, scheduled_at, technicians(name)')
    .lt('scheduled_at', startOfToday.toISOString())
    .not('status', 'in', '(completed,abandoned,cancelled)');

  if (error) {
    console.error('[check-abandoned]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = [];

  for (const sched of (overdueSchedules || [])) {
    const techName   = sched.technicians?.name || 'Técnico';
    const dataAgend  = new Date(sched.scheduled_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    // Se tem inventário vinculado, verifica o status atual
    let invStatus = null;
    if (sched.inventory_id) {
      const { data: inv } = await supabase
        .from('inventories')
        .select('status')
        .eq('id', sched.inventory_id)
        .maybeSingle();

      invStatus = inv?.status || null;

      // Já foi encerrado — apenas garante que o schedule também está encerrado
      if (invStatus && ['completed', 'abandoned'].includes(invStatus)) {
        await supabase
          .from('inventory_schedules')
          .update({ status: invStatus, updated_at: now.toISOString() })
          .eq('id', sched.id);
        continue;
      }

      // Marca inventário como abandonado (inclui recount_pending expirado)
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

    const motivo = invStatus === 'recount_pending'
      ? `Recontagem agendada para ${dataAgend} não foi realizada e foi marcada como abandonada.`
      : `Inventário agendado para ${dataAgend} não foi realizado e foi marcado como abandonado.`;

    // Cria alerta para o supervisor
    await supabase.from('alerts').insert({
      type:          'abandonment',
      severity:      'high',
      title:         `Inventário não realizado — ${techName}`,
      description:   motivo,
      technician_id: sched.technician_id || null,
      inventory_id:  sched.inventory_id  || null,
      resolved:      false,
      created_at:    now.toISOString(),
    });

    results.push({ schedule_id: sched.id, technician: techName, scheduled_at: sched.scheduled_at, action: 'abandoned' });
  }

  // Também verifica inventários recount_pending sem agendamento ativo (ficaram órfãos)
  // Considera órfão se o inventário tem mais de 3 dias sem ser completado
  const tresDiasAtras = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recountOrfaos } = await supabase
    .from('inventories')
    .select('id, technician_id, week_ref, technicians(name)')
    .eq('status', 'recount_pending')
    .lt('updated_at', tresDiasAtras);

  for (const inv of (recountOrfaos || [])) {
    const techName = inv.technicians?.name || 'Técnico';

    await supabase
      .from('inventories')
      .update({ status: 'abandoned', updated_at: now.toISOString() })
      .eq('id', inv.id);

    await supabase.from('alerts').insert({
      type:          'abandonment',
      severity:      'high',
      title:         `Recontagem não concluída — ${techName}`,
      description:   `Recontagem da semana ${inv.week_ref} não foi concluída em 3 dias e foi marcada como abandonada.`,
      technician_id: inv.technician_id || null,
      inventory_id:  inv.id,
      resolved:      false,
      created_at:    now.toISOString(),
    });

    results.push({ inventory_id: inv.id, technician: techName, week_ref: inv.week_ref, action: 'abandoned_recount_orphan' });
  }

  return NextResponse.json({
    ok:        true,
    processed: results.length,
    results,
  });
}
