/**
 * app/api/sync/pecas/route.js
 *
 * Endpoint HTTP para disparar a sincronização de peças Databricks → Supabase.
 * Pode ser chamado:
 *   - Pelo Vercel Cron (vercel.json — GET às 08h BRT / 11h UTC)
 *   - Pelo Power Automate (POST com header x-dispatch-secret)
 *   - Manualmente por um administrador autenticado (POST com sessão NextAuth)
 *
 * Autenticação:
 *   - Header x-dispatch-secret: SEU_DISPATCH_SECRET  (chamadas externas)
 *   - Header authorization: Bearer CRON_SECRET       (Vercel Cron)
 *   - Sessão NextAuth ativa                          (chamadas manuais via UI)
 *
 * GET  → Vercel Cron dispara a sincronização completa
 * POST → Power Automate ou chamada manual dispara a sincronização
 *        Body opcional: { triggered_by: string, tech_id: number }
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getTechnicianItems } from '@/lib/databricks';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAuthorized(request, session) {
  // 1. Header x-dispatch-secret (Power Automate, chamadas externas)
  const dispatchSecret = request.headers.get('x-dispatch-secret');
  if (dispatchSecret && dispatchSecret === process.env.DISPATCH_SECRET) return true;

  // 2. Header Authorization: Bearer CRON_SECRET (Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (authHeader && process.env.CRON_SECRET) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token === process.env.CRON_SECRET) return true;
  }

  // 3. Sessão NextAuth autenticada (qualquer usuário logado pode disparar manualmente)
  if (session?.user) return true;

  return false;
}

function generateBatchId() {
  return `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ── Lógica central de sincronização ──────────────────────────────────────────

async function runSync({ supabase, triggeredBy = 'cron', techId = null }) {
  const batchId  = generateBatchId();
  const syncedAt = new Date().toISOString();

  // Verifica se já há uma sincronização em andamento (últimos 30 min)
  const { data: running } = await supabase
    .from('datalake_sync_log')
    .select('id, started_at')
    .eq('status', 'running')
    .gte('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString())
    .maybeSingle();

  if (running) {
    return {
      conflict: true,
      error: 'Já existe uma sincronização em andamento',
      running_since: running.started_at,
    };
  }

  // Cria registro de controle
  const { data: logRow, error: logErr } = await supabase
    .from('datalake_sync_log')
    .insert({
      batch_id:     batchId,
      status:       'running',
      started_at:   syncedAt,
      triggered_by: triggeredBy,
    })
    .select('id')
    .single();

  if (logErr) throw new Error(`Erro ao criar log: ${logErr.message}`);
  const logId = logRow.id;

  // Busca técnicos ativos
  let techQuery = supabase
    .from('technicians')
    .select('id, name, databricks_name')
    .eq('active', true);

  if (techId) techQuery = techQuery.eq('id', techId);

  const { data: technicians, error: techErr } = await techQuery;
  if (techErr) {
    await supabase.from('datalake_sync_log').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error_message: techErr.message,
    }).eq('id', logId);
    throw new Error(techErr.message);
  }

  // Processa cada técnico
  let techOk      = 0;
  let techFailed  = 0;
  let totalUpsert = 0;
  let totalDeact  = 0;
  const errors    = [];

  for (const tech of technicians) {
    const searchName = tech.databricks_name || tech.name;

    try {
      // 1. Busca peças no Databricks com as regras de filtro
      const databricksItems = await getTechnicianItems(searchName);

      // 2. Upsert no Supabase (em lotes de 100)
      if (databricksItems.length > 0) {
        const rows = databricksItems.map(item => ({
          technician_id:    tech.id,
          item_code:        String(item.item_code || '').trim(),
          item_name:        String(item.item_name || '').trim(),
          item_quantity:    item.item_quantity != null ? parseInt(item.item_quantity, 10) : null,
          item_num_remessa: item.item_num_remessa != null ? String(item.item_num_remessa).trim() : null,
          unit:             'un',
          active:           true,
          synced_at:        syncedAt,
          sync_batch_id:    batchId,
          updated_at:       syncedAt,
        }));

        for (let i = 0; i < rows.length; i += 100) {
          const chunk = rows.slice(i, i + 100);
          const { error: upsertErr } = await supabase
            .from('technician_items')
            .upsert(chunk, { onConflict: 'technician_id,item_code' });

          if (upsertErr) throw new Error(`Upsert error: ${upsertErr.message}`);
          totalUpsert += chunk.length;
        }
      }

      // 3. Soft-delete de peças que saíram do Datalake para este técnico
      const activeCodes = databricksItems
        .map(i => String(i.item_code || '').trim())
        .filter(Boolean);

      const { data: existing } = await supabase
        .from('technician_items')
        .select('id, item_code')
        .eq('technician_id', tech.id)
        .eq('active', true);

      const toDeactivate = (existing || [])
        .filter(r => !activeCodes.includes(r.item_code))
        .map(r => r.id);

      if (toDeactivate.length > 0) {
        const { error: deactErr } = await supabase
          .from('technician_items')
          .update({ active: false, updated_at: syncedAt })
          .in('id', toDeactivate);

        if (deactErr) throw new Error(`Deactivate error: ${deactErr.message}`);
        totalDeact += toDeactivate.length;
      }

      techOk++;
    } catch (err) {
      techFailed++;
      errors.push({ tech_id: tech.id, tech_name: tech.name, error: err.message });
    }
  }

  // Atualiza registro de controle
  const finishedAt  = new Date().toISOString();
  const finalStatus = techFailed === 0 ? 'success'
    : techOk === 0 ? 'failed'
    : 'partial';

  await supabase.from('datalake_sync_log').update({
    finished_at:          finishedAt,
    status:               finalStatus,
    technicians_total:    technicians.length,
    technicians_ok:       techOk,
    technicians_failed:   techFailed,
    items_upserted:       totalUpsert,
    items_deactivated:    totalDeact,
    error_message:        errors.length > 0
      ? errors.map(e => `${e.tech_name}: ${e.error}`).join(' | ')
      : null,
  }).eq('id', logId);

  return {
    ok:                 finalStatus !== 'failed',
    status:             finalStatus,
    batch_id:           batchId,
    started_at:         syncedAt,
    finished_at:        finishedAt,
    technicians_total:  technicians.length,
    technicians_ok:     techOk,
    technicians_failed: techFailed,
    items_upserted:     totalUpsert,
    items_deactivated:  totalDeact,
    errors:             errors.length > 0 ? errors : undefined,
  };
}

// ── GET: Vercel Cron ou status da última sincronização ────────────────────────

export async function GET(request) {
  const session = await getServerSession(authOptions);

  // Se for chamada do Vercel Cron (com Authorization: Bearer CRON_SECRET), dispara sync
  const authHeader = request.headers.get('authorization');
  const isCronCall = authHeader && process.env.CRON_SECRET &&
    authHeader.replace('Bearer ', '').trim() === process.env.CRON_SECRET;

  if (isCronCall) {
    // Chamada do Vercel Cron → dispara sincronização completa
    const supabase = createServiceClient();
    try {
      const result = await runSync({ supabase, triggeredBy: 'cron' });
      if (result.conflict) {
        return NextResponse.json(result, { status: 409 });
      }
      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // Chamada normal → retorna status da última sincronização
  if (!isAuthorized(request, session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServiceClient();

  const { data: logs } = await supabase
    .from('datalake_sync_log')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  const { data: lastSync } = await supabase
    .from('v_last_datalake_sync')
    .select('*')
    .maybeSingle();

  return NextResponse.json({
    last_successful_sync: lastSync || null,
    recent_logs: logs || [],
  });
}

// ── POST: Power Automate ou chamada manual ────────────────────────────────────

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body = {};
  try { body = await request.json(); } catch { /* body vazio é ok */ }

  const triggeredBy = body.triggered_by || 'api';
  const techId      = body.tech_id ? parseInt(body.tech_id, 10) : null;

  const supabase = createServiceClient();

  try {
    const result = await runSync({ supabase, triggeredBy, techId });
    if (result.conflict) {
      return NextResponse.json(result, { status: 409 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
