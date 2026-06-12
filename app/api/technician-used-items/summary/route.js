/**
 * GET /api/technician-used-items/summary?supervisor=NOME
 * Retorna pecas usadas agrupadas por tecnico (tecnico-first, ordem alfabetica).
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
    .select('id, name, region')
    .eq('supervisor_name', supervisor)
    .eq('active', true)
    .order('name');

  if (!techs?.length) {
    return NextResponse.json({ technicians: [], last_sync: null });
  }

  const techIds  = techs.map(t => t.id);
  const techById = Object.fromEntries(techs.map(t => [t.id, t]));

  const { data: rows, error } = await supabase
    .from('technician_used_items')
    .select('item_code, item_name, item_subgroup, item_quantity, status_consumo, chamado_consumo, technician_id')
    .in('technician_id', techIds)
    .eq('active', true)
    .order('item_code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = {};
  for (const row of (rows || [])) {
    const tech = techById[row.technician_id];
    if (!tech) continue;
    if (!grouped[tech.name]) {
      grouped[tech.name] = { id: tech.id, name: tech.name, region: tech.region, items: [] };
    }
    grouped[tech.name].items.push({
      item_code:       row.item_code,
      item_name:       row.item_name,
      item_subgroup:   row.item_subgroup,
      item_quantity:   row.item_quantity,
      status_consumo:  row.status_consumo,
      chamado_consumo: row.chamado_consumo,
    });
  }

  const technicians = Object.values(grouped)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const { data: lastSyncRaw } = await supabase
    .from('datalake_sync_log')
    .select('finished_at, status')
    .like('batch_id', 'sync-usadas-%')
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const lastSync = lastSyncRaw
    ? { ...lastSyncRaw, formatted_at: lastSyncRaw.finished_at ? new Date(lastSyncRaw.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null }
    : null;

  return NextResponse.json({ technicians, last_sync: lastSync });
}
