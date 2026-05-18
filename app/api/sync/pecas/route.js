/**
 * app/api/sync/pecas/route.js — VERSÃO TURBO (Bulk Processing)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getAllTechniciansItems } from '@/lib/databricks';

export const maxDuration = 300; // 5 minutos de limite no Vercel

function isAuthorized(request, session) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret && secret === process.env.DISPATCH_SECRET) return true;
  if (session?.user) return true;
  return false;
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const triggeredBy = body.triggered_by || 'api';
  
  const supabase = createServiceClient();
  const batchId = `sync-${Date.now()}`;
  const syncedAt = new Date().toISOString();

  // 1. Verifica se já há um rodando
  const { data: running } = await supabase
    .from('datalake_sync_log')
    .select('id')
    .eq('status', 'running')
    .maybeSingle();

  if (running) return NextResponse.json({ error: 'Sincronização em andamento' }, { status: 409 });

  // 2. Cria log inicial
  const { data: logRow } = await supabase.from('datalake_sync_log').insert({
    batch_id: batchId, status: 'running', started_at: syncedAt, triggered_by: triggeredBy
  }).select('id').single();

  // 3. Inicia processamento (Sem await para responder rápido ao Power Automate)
  // No Next.js 13+ App Router, o processo continua até o fim da função ou timeout
  const processPromise = (async () => {
    try {
      // A. Busca técnicos
      const { data: techs } = await supabase.from('technicians').select('id, name, databricks_name').eq('active', true);
      const techNames = techs.map(t => (t.databricks_name || t.name).trim().toUpperCase());
      
      // B. Busca TUDO no Databricks de uma vez (TURBO)
      const allItems = await getAllTechniciansItems(techNames);
      
      // C. Agrupa itens por técnico
      const itemsByTech = {};
      allItems.forEach(item => {
        const key = item.technician_name_key;
        if (!itemsByTech[key]) itemsByTech[key] = [];
        itemsByTech[key].push(item);
      });

      let totalUpserted = 0;
      let techsOk = 0;

      // D. Processa cada técnico localmente
      for (const tech of techs) {
        const key = (tech.databricks_name || tech.name).trim().toUpperCase();
        const techItems = itemsByTech[key] || [];
        
        // Upsert das peças
        if (techItems.length > 0) {
          const rows = techItems.map(item => ({
            technician_id: tech.id,
            item_code: String(item.item_code).trim(),
            item_name: String(item.item_name).trim(),
            item_quantity: parseInt(item.item_quantity) || 0,
            item_num_remessa: String(item.item_num_remessa || '').trim(),
            active: true, synced_at: syncedAt, sync_batch_id: batchId, updated_at: syncedAt
          }));
          await supabase.from('technician_items').upsert(rows, { onConflict: 'technician_id,item_code' });
          totalUpserted += rows.length;
        }

        // Soft-delete (desativa quem não veio)
        const activeCodes = techItems.map(i => String(i.item_code).trim());
        await supabase.from('technician_items')
          .update({ active: false, updated_at: syncedAt })
          .eq('technician_id', tech.id)
          .eq('active', true)
          .not('item_code', 'in', `(${activeCodes.length > 0 ? activeCodes.map(c => `"${c}"`).join(',') : '""'})`);
        
        techsOk++;
      }

      // E. Finaliza log
      await supabase.from('datalake_sync_log').update({
        status: 'success', finished_at: new Date().toISOString(),
        technicians_total: techs.length, technicians_ok: techsOk, items_upserted: totalUpserted
      }).eq('id', logRow.id);

    } catch (err) {
      await supabase.from('datalake_sync_log').update({
        status: 'failed', finished_at: new Date().toISOString(), error_message: err.message
      }).eq('id', logRow.id);
    }
  })();

  // Responde imediatamente
  return NextResponse.json({ 
    message: 'Sincronização iniciada em background', 
    batch_id: batchId,
    info: 'Acompanhe o progresso pela tabela datalake_sync_log ou na página de peças.'
  }, { status: 202 });
}
