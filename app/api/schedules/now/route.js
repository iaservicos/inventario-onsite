/**
 * GET /api/schedules/now
 *
 * Retorna agendamentos pendentes para o horário atual (±10 minutos).
 * Usado pelo Power Automate (a cada 5 min) para disparar o inventário no horário certo.
 *
 * Autenticação: header x-dispatch-secret
 *
 * Resposta:
 * {
 *   count: 1,
 *   schedules: [
 *     {
 *       schedule_id: "uuid",
 *       technician_name: "RODRIGO RODRIGUES",
 *       technician_phone: "5511999999999",
 *       week_ref: "2026-W20",
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
  // Autenticação
  const secret = request.headers.get('x-dispatch-secret');
  if (secret !== process.env.DISPATCH_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Janela de ±10 minutos em torno do horário atual
  const now = new Date();
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000); // 10 min atrás
  const windowEnd = new Date(now.getTime() + 10 * 60 * 1000);   // 10 min à frente

  const { data: schedules, error } = await supabase
    .from('inventory_schedules')
    .select(`
      id,
      scheduled_at,
      week_ref,
      items_count,
      status,
      technicians (
        id,
        name,
        phone,
        databricks_name,
        active
      )
    `)
    .eq('status', 'pending')
    .gte('scheduled_at', windowStart.toISOString())
    .lte('scheduled_at', windowEnd.toISOString())
    .order('scheduled_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Filtra apenas técnicos ativos
  const result = (schedules || [])
    .filter(s => s.technicians?.active)
    .map(s => ({
      schedule_id: s.id,
      scheduled_at: s.scheduled_at,
      week_ref: s.week_ref,
      technician_name: s.technicians.name,
      technician_phone: s.technicians.phone || '',
      items_count: s.items_count || 10,
    }));

  return NextResponse.json({
    count: result.length,
    checked_at: now.toISOString(),
    window_start: windowStart.toISOString(),
    window_end: windowEnd.toISOString(),
    schedules: result,
  });
}
