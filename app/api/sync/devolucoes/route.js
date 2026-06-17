/**
 * Sync: espelha vw_dev_tecnico_pendente no Supabase.
 * Carga full (apaga e recria) — a view ja filtra apenas pendentes.
 * POST com x-dispatch-secret (Power Automate) ou GET com Authorization: Bearer CRON_SECRET.
 */
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getAllTechniciansPendingReturns } from '@/lib/databricks';

export const maxDuration = 300;

function isAuthorized(request, session) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret && secret === process.env.DISPATCH_SECRET) return true;
  const auth = request.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (session?.user?.role === 'admin') return true;
  return false;
}

async function runSync(triggeredBy) {
  const supabase = createServiceClient();
  const batchId = `sync-devolucoes-${Date.now()}`;
  const syncedAt = new Date().toISOString();

  const { data: logRow } = await supabase.from('datalake_sync_log').insert({
    batch_id: batchId, status: 'running', started_at: syncedAt, triggered_by: triggeredBy,
  }).select('id').single();

  try {
    const { data: techs } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('active', true);

    if (!techs?.length) throw new Error('Nenhum tecnico ativo.');

    const techIds = techs.map(t => t.id);
    const techMap = {};
    techs.forEach(t => {
      const name = (t.databricks_name || t.name).trim().toUpperCase();
      techMap[name] = t.id;
    });

    const allItems = await getAllTechniciansPendingReturns(Object.keys(techMap));

    // Carga full: apaga tudo dos tecnicos ativos e reinsere
    await supabase.from('technician_pending_returns').delete().in('technician_id', techIds);

    const insertRows = allItems.map(item => {
      const techId = techMap[item.technician_name_key];
      if (!techId) return null;
      return {
        technician_id:            techId,
        lote_dev_tecnico_id:      item.lote_dev_tecnico_id || null,
        peca_fisica_id:           item.peca_fisica_id || null,
        status_devolucao:         item.status_devolucao || null,
        status_consumo:           item.status_consumo || null,
        data_montagem_lote:       item.data_montagem_lote || null,
        data_envio_lote:          item.data_envio_lote || null,
        data_recebimento_atp:     item.data_recebimento_atp || null,
        data_recusado_atp:        item.data_recusado_atp || null,
        data_recebimento_tecnico: item.data_recebimento_tecnico || null,
        dias_aguardando:          item.dias_aguardando != null ? parseInt(item.dias_aguardando) : null,
        dt_materializacao:        item.dt_materializacao || null,
        synced_at:                syncedAt,
        sync_batch_id:            batchId,
        updated_at:               syncedAt,
      };
    }).filter(Boolean);

    for (let i = 0; i < insertRows.length; i += 500) {
      const chunk = insertRows.slice(i, i + 500);
      const { error: insError } = await supabase.from('technician_pending_returns').insert(chunk);
      if (insError) throw new Error(`Erro ao inserir devolucoes: ${insError.message}`);
    }

    await supabase.from('datalake_sync_log').update({
      status: 'success', finished_at: new Date().toISOString(),
      technicians_total: techs.length, technicians_ok: techs.length,
      items_upserted: insertRows.length,
    }).eq('id', logRow.id);

    return { ok: true, status: 'success', total_gravado: insertRows.length, batch_id: batchId };

  } catch (err) {
    await supabase.from('datalake_sync_log').update({
      status: 'failed', finished_at: new Date().toISOString(), error_message: err.message,
    }).eq('id', logRow.id);
    throw err;
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runSync('cron');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const result = await runSync(body.triggered_by || 'api');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
