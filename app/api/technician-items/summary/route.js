/**
 * GET /api/technician-items/summary?supervisor=NOME
 * Retorna pecas novas agregadas de todos os tecnicos de um supervisor.
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  if (!['admin', 'coordinator'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const supervisor = searchParams.get('supervisor');
  if (!supervisor) return NextResponse.json({ error: 'supervisor obrigatorio' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: techs } = await supabase
    .from('technicians')
    .select('id, name')
    .eq('supervisor_name', supervisor)
    .eq('active', true)
    .order('name');

  if (!techs?.length) {
    return NextResponse.json({ items: [], technicians: [], total: 0, last_sync: null });
  }

  const techIds = techs.map(t => t.id);
  const techMap = Object.fromEntries(techs.map(t => [t.id, t.name]));

  const { data: rows, error } = await supabase
    .from('technician_items')
    .select('item_code, item_name, item_subgroup, item_quantity, technician_id')
    .in('technician_id', techIds)
    .eq('active', true)
    .order('item_code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = {};
  for (const row of (rows || [])) {
    if (!grouped[row.item_code]) {
      grouped[row.item_code] = {
        item_code:      row.item_code,
        item_name:      row.item_name,
        item_subgroup:  row.item_subgroup,
        total_quantity: 0,
        technicians:    [],
      };
    }
    grouped[row.item_code].total_quantity += row.item_quantity || 0;
    grouped[row.item_code].technicians.push({
      name:     techMap[row.technician_id] || '?',
      quantity: row.item_quantity || 0,
    });
  }

  const items = Object.values(grouped).sort((a, b) => a.item_code.localeCompare(b.item_code));

  const { data: lastSyncRaw } = await supabase
    .from('v_last_datalake_sync')
    .select('finished_at, formatted_at, status, items_upserted')
    .maybeSingle();

  return NextResponse.json({ items, technicians: techs, total: items.length, last_sync: lastSyncRaw });
}
