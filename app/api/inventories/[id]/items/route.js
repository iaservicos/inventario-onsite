import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const inventoryId = parseInt(params.id);

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, item_code, item_name, item_subgroup, system_qty, physical_qty, status, has_divergence, counted_at')
    .eq('inventory_id', inventoryId)
    .order('has_divergence', { ascending: false })
    .order('item_name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data || []);
}
