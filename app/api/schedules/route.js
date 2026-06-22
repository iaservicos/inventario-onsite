import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSchedules, createSchedule } from '@/lib/db-gptmaker';
import { getWeekSubgroup, getConsolidatedTechnicianItems } from '@/lib/db';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const data = await getSchedules({
    technicianId: searchParams.get('technicianId') || '',
    status: searchParams.get('status') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
  });
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor', 'coordinator', 'analyst'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { technician_id, scheduled_at, week_ref, notes, inventory_type } = body;

  if (!technician_id || !scheduled_at || !week_ref) {
    return NextResponse.json({ error: 'technician_id, scheduled_at e week_ref são obrigatórios' }, { status: 400 });
  }

  const isGeneral = inventory_type === 'general';
  const supabase = createServiceClient();

  let weekSubgroup = null;
  if (!isGeneral) {
    weekSubgroup = await getWeekSubgroup(supabase);
  }

  const consolidatedItems = await getConsolidatedTechnicianItems(supabase, technician_id, weekSubgroup);

  if (!consolidatedItems?.length) {
    return NextResponse.json({ error: 'Técnico sem peças ativas para inventário.' }, { status: 400 });
  }

  const data = await createSchedule({
    technician_id,
    scheduled_by: session.user.id,
    scheduled_at,
    week_ref,
    items_count: consolidatedItems.length,
    notes,
    scheduled_subgroup: isGeneral ? null : weekSubgroup,
    scheduled_items: consolidatedItems,
    inventory_type: isGeneral ? 'general' : 'subgroup',
  });
  return NextResponse.json(data, { status: 201 });
}
