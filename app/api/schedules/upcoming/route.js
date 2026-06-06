import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getScopeFilter } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const scope = await getScopeFilter(session);
  if (scope !== null && scope.length === 0) return NextResponse.json([]);

  const now = new Date();
  const in14days = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  let schedulesQuery = supabase
    .from('inventory_schedules')
    .select(`
      id, scheduled_at, week_ref, scheduled_subgroup, items_count, status,
      technicians(id, name, region)
    `)
    .eq('status', 'pending')
    .gte('scheduled_at', now.toISOString())
    .lte('scheduled_at', in14days.toISOString())
    .order('scheduled_at', { ascending: true });

  if (scope !== null) schedulesQuery = schedulesQuery.in('technician_id', scope);

  const { data: schedules, error } = await schedulesQuery;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch available subgroups for each unique technician in one query
  const techIds = [...new Set((schedules || []).map(s => s.technicians?.id).filter(Boolean))];

  const subgroupsByTech = {};
  if (techIds.length > 0) {
    const { data: items } = await supabase
      .from('technician_items')
      .select('technician_id, item_subgroup')
      .in('technician_id', techIds)
      .eq('active', true)
      .not('item_subgroup', 'is', null);

    for (const item of (items || [])) {
      const s = (item.item_subgroup || '').trim();
      if (!s) continue;
      if (!subgroupsByTech[item.technician_id]) subgroupsByTech[item.technician_id] = new Set();
      subgroupsByTech[item.technician_id].add(s);
    }
  }

  const result = (schedules || []).map(s => ({
    id: s.id,
    scheduled_at: s.scheduled_at,
    week_ref: s.week_ref,
    scheduled_subgroup: s.scheduled_subgroup,
    items_count: s.items_count,
    status: s.status,
    technician_id: s.technicians?.id,
    technician_name: s.technicians?.name,
    technician_region: s.technicians?.region,
    available_subgroups: [...(subgroupsByTech[s.technicians?.id] || [])].sort(),
  }));

  return NextResponse.json(result);
}
