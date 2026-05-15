/**
 * GET /api/schedules/tomorrow
 *
 * Retorna todos os inventários agendados para amanhã.
 * Usado pelo Power Automate para disparar o alerta D-1 via Dispara.AI.
 *
 * Autenticação: header x-dispatch-secret
 *
 * Resposta:
 * {
 *   date: "2026-05-16",
 *   count: 3,
 *   schedules: [
 *     {
 *       schedule_id: "uuid",
 *       scheduled_at: "2026-05-16T09:00:00.000Z",
 *       scheduled_date: "16/05/2026",
 *       scheduled_time: "09:00",
 *       week_ref: "2026-W20",
 *       technician_name: "RODRIGO RODRIGUES",
 *       technician_phone: "5511999999999",
 *       supervisor_name: "Deyvson",
 *       items_count: 10
 *     }
 *   ]
 * }
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  // Autenticação via header
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Calcula o intervalo de "amanhã" em UTC
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(now.getUTCDate() + 1);

  const tomorrowStart = new Date(
    Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 0, 0, 0)
  );
  const tomorrowEnd = new Date(
    Date.UTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), 23, 59, 59)
  );

  const tomorrowDateStr = tomorrowStart.toISOString().split('T')[0]; // "2026-05-16"

  // Busca agendamentos pendentes para amanhã
  const { data: schedules, error } = await supabase
    .from('inventory_schedules')
    .select(`
      id,
      scheduled_at,
      week_ref,
      items_count,
      notes,
      status,
      technicians (
        id,
        name,
        phone,
        supervisor_name,
        databricks_name,
        active
      )
    `)
    .eq('status', 'pending')
    .gte('scheduled_at', tomorrowStart.toISOString())
    .lte('scheduled_at', tomorrowEnd.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtra apenas técnicos ativos com telefone
  const result = (schedules || [])
    .filter(s => s.technicians?.active && s.technicians?.phone)
    .map(s => {
      const scheduledAt = new Date(s.scheduled_at);

      // Formata data e hora no padrão brasileiro
      const scheduledDate = scheduledAt.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      const scheduledTime = scheduledAt.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit',
      });

      return {
        schedule_id: s.id,
        scheduled_at: s.scheduled_at,
        scheduled_date: scheduledDate,
        scheduled_time: scheduledTime,
        week_ref: s.week_ref,
        technician_name: s.technicians.name,
        technician_phone: s.technicians.phone,
        supervisor_name: s.technicians.supervisor_name || '',
        items_count: s.items_count || 10,
      };
    });

  // Registra log do alerta D-1 no banco
  if (result.length > 0) {
    const alertLogs = result.map(s => ({
      inventory_id: null,
      type: 'reminder_d1',
      severity: 'low',
      message: `Alerta D-1 enviado para ${s.technician_name} — inventário amanhã às ${s.scheduled_time}`,
      technician_id: schedules.find(sc => sc.id === s.schedule_id)?.technicians?.id || null,
      created_at: new Date().toISOString(),
    }));

    // Insere silenciosamente — não bloqueia a resposta se falhar
    supabase.from('alerts').insert(alertLogs).then(() => {});
  }

  return NextResponse.json({
    date: tomorrowDateStr,
    count: result.length,
    schedules: result,
  });
}
