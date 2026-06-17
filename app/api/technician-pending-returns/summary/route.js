/**
 * GET /api/technician-pending-returns/summary?supervisor=NOME
 * Retorna devolucoes pendentes agrupadas por tecnico (admin e coordinator).
 * Para cada tecnico: contagem MONTADO, contagem ENVIADO e max dias_aguardando.
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

  if (!techs?.length) return NextResponse.json({ technicians: [], last_sync: null });

  const techIds  = techs.map(t => t.id);
  const techById = Object.fromEntries(techs.map(t => [t.id, t]));

  const { data: rows, error } = await supabase
    .from('technician_pending_returns')
    .select('technician_id, lote_dev_tecnico_id, status_devolucao, dias_aguardando')
    .in('technician_id', techIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrupa por tecnico contando lotes únicos e peças por status
  const grouped = {};
  for (const row of (rows || [])) {
    const tech = techById[row.technician_id];
    if (!tech) continue;
    if (!grouped[tech.id]) {
      grouped[tech.id] = {
        id: tech.id, name: tech.name, region: tech.region,
        montado_pecas: 0, enviado_pecas: 0,
        montado_lotes: new Set(), enviado_lotes: new Set(),
        max_dias: 0,
      };
    }
    const g = grouped[tech.id];
    if (row.status_devolucao === 'MONTADO') {
      g.montado_pecas += 1;
      if (row.lote_dev_tecnico_id) g.montado_lotes.add(row.lote_dev_tecnico_id);
    } else if (row.status_devolucao === 'ENVIADO') {
      g.enviado_pecas += 1;
      if (row.lote_dev_tecnico_id) g.enviado_lotes.add(row.lote_dev_tecnico_id);
    }
    if ((row.dias_aguardando || 0) > g.max_dias) g.max_dias = row.dias_aguardando;
  }

  const technicians = Object.values(grouped)
    .map(g => ({
      id: g.id, name: g.name, region: g.region,
      montado_pecas:  g.montado_pecas,
      montado_lotes:  g.montado_lotes.size,
      enviado_pecas:  g.enviado_pecas,
      enviado_lotes:  g.enviado_lotes.size,
      max_dias:       g.max_dias,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const { data: lastSyncRaw } = await supabase
    .from('datalake_sync_log')
    .select('finished_at, status')
    .like('batch_id', 'sync-devolucoes-%')
    .eq('status', 'success')
    .order('finished_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const last_sync = lastSyncRaw
    ? {
        ...lastSyncRaw,
        formatted_at: lastSyncRaw.finished_at
          ? new Date(lastSyncRaw.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          : null,
      }
    : null;

  return NextResponse.json({ technicians, last_sync });
}
