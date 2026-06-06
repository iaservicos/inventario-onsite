import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || '';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Forçamos o ID a ser um número inteiro, caso o banco espere integer
    const scheduleId = parseInt(body.schedule_id);

    if (isNaN(scheduleId)) {
      return NextResponse.json({ error: 'ID de agendamento inválido' }, { status: 400 });
    }

    const supabase = createServiceClient();

    // 1. Atualiza o status do agendamento primeiro (operação mais rápida)
    const { error: updateError } = await supabase
      .from('inventory_schedules')
      .update({ status: 'dispatched' })
      .eq('id', scheduleId);

    if (updateError) throw updateError;

    // 2. Busca os dados para criar o inventário
    const { data: schedule, error: sError } = await supabase
      .from('inventory_schedules')
      .select('technician_id, scheduled_items')
      .eq('id', scheduleId)
      .single();

    if (sError || !schedule) throw new Error('Agendamento não encontrado após atualização');

    // 3. Cria o registro de inventário
    await supabase.from('inventories').insert({
      technician_id: schedule.technician_id,
      schedule_id: scheduleId,
      status: 'in_progress',
      items: schedule.scheduled_items || []
    });

    return NextResponse.json({ 
      success: true, 
      message: "Status atualizado e inventário criado!" 
    });

  } catch (err) {
    console.error('Erro no Dispatch:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
