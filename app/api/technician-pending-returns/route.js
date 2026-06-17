/**
 * GET /api/technician-pending-returns?technicianId=X
 * Retorna devolucoes pendentes de um tecnico especifico.
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId');
  if (!technicianId) return NextResponse.json({ error: 'technicianId obrigatorio' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: items, error } = await supabase
    .from('technician_pending_returns')
    .select(`
      id, lote_dev_tecnico_id, cod_peca, descr_peca, status_devolucao, status_consumo,
      data_montagem_lote, data_envio_lote, data_recebimento_atp, data_recusado_atp,
      data_recebimento_tecnico, dias_aguardando, dt_materializacao, synced_at, sync_batch_id
    `)
    .eq('technician_id', technicianId)
    .order('status_devolucao')
    .order('data_montagem_lote', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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

  return NextResponse.json({ items: items || [], last_sync, total: (items || []).length });
}
