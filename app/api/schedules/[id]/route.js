import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateSchedule } from '@/lib/db-gptmaker';
import { getConsolidatedTechnicianItems } from '@/lib/db';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  // When subgroup changes, recalculate the items list and count
  if (body.scheduled_subgroup !== undefined) {
    const supabase = createServiceClient();
    const { data: sched } = await supabase
      .from('inventory_schedules')
      .select('technician_id, inventory_type')
      .eq('id', params.id)
      .single();

    if (sched) {
      // General inventories always load all items (null subgroup filter)
      const subgroupFilter = sched.inventory_type === 'general' ? null : body.scheduled_subgroup;
      const items = await getConsolidatedTechnicianItems(supabase, sched.technician_id, subgroupFilter);
      body.scheduled_items = items;
      body.items_count = items.length;
    }
  }

  const data = await updateSchedule(params.id, body);
  return NextResponse.json(data);
}

export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServiceClient();

  // Busca o inventário vinculado ao agendamento
  const { data: sched } = await supabase
    .from('inventory_schedules')
    .select('inventory_id')
    .eq('id', params.id)
    .maybeSingle();

  // Se o inventário vinculado ainda não foi iniciado (pending), exclui do banco
  if (sched?.inventory_id) {
    const { data: inv } = await supabase
      .from('inventories')
      .select('status')
      .eq('id', sched.inventory_id)
      .maybeSingle();

    if (inv && inv.status === 'pending') {
      await supabase.from('inventory_items').delete().eq('inventory_id', sched.inventory_id);
      await supabase.from('inventories').delete().eq('id', sched.inventory_id);
    }
  }

  await updateSchedule(params.id, { status: 'cancelled' });
  return NextResponse.json({ ok: true });
}
