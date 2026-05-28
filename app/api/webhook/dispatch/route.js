import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
const SECRET = process.env.DISPATCH_SECRET || 'dispatch@positivo2026';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { schedule_id } = body;

    if (!schedule_id) return NextResponse.json({ error: 'schedule_id is required' }, { status: 400 });

    const supabase = createServiceClient();

    // 1. Busca dados básicos do agendamento
    const { data: schedule, error: sError } = await supabase
      .from('inventory_schedules')
      .select('*, technicians(*)')
      .eq('id', schedule_id)
      .single();

    if (sError || !schedule) return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });

    // 2. Cria o inventário (Vapt-Vupt)
    const { data: inventory, error: iError } = await supabase
      .from('inventories')
      .insert({
        technician_id: schedule.technician_id,
        schedule_id: schedule.id,
        status: 'in_progress', // Já começa como em progresso
        items: schedule.scheduled_items || []
      })
      .select()
      .single();

    if (iError) throw iError;

    // 3. Atualiza o agendamento para 'dispatched'
    await supabase
      .from('inventory_schedules')
      .update({ status: 'dispatched' })
      .eq('id', schedule_id);

    return NextResponse.json({ 
      success: true, 
      inventory_id: inventory.id,
      message: "Inventário iniciado com sucesso no banco!"
    });

  } catch (err) {
    console.error('Erro no Dispatch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
