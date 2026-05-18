/**
 * app/api/sync/pecas/route.js
 * VERSÃO: 4.0.0 (FULL REFRESH - Modo Blindado)
 * 
 * Esta versão limpa as peças antigas ANTES de gravar as novas.
 * Isso resolve o problema de peças ficarem presas no status 'active=false'.
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getAllTechniciansItems } from '@/lib/databricks';

export const maxDuration = 300; 

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

  // 1. Destrava logs antigos
  await supabase.from('datalake_sync_log').update({ status: 'failed' }).eq('status', 'running');

  // 2. Cria log inicial
  const { data: logRow } = await supabase.from('datalake_sync_log').insert({
    batch_id: batchId, status: 'running', started_at: syncedAt, triggered_by: triggeredBy
  }).select('id').single();

  try {
    // A. Busca técnicos ativos
    const { data: techs } = await supabase.from('technicians').select('id, name, databricks_name').eq('active', true);
    if (!techs?.length) throw new Error('Nenhum técnico ativo.');

    const techMap = {};
    const techIds = techs.map(t => t.id);
    techs.forEach(t => {
      const name = (t.databricks_name || t.name).trim().toUpperCase();
      techMap[name] = t.id;
    });

    // B. Busca TUDO no Databricks (TURBO)
    const allItems = await getAllTechniciansItems(Object.keys(techMap));
    
    if (allItems.length === 0) {
      throw new Error('Databricks retornou zero peças. Verifique os filtros.');
    }

    // C. MODO BLINDADO: Desativa TODAS as peças desses técnicos antes de começar
    // Isso garante que só ficará ativo o que o Databricks enviar agora.
    await supabase.from('technician_items')
      .update({ active: false, updated_at: syncedAt })
      .in('technician_id', techIds);

    // D. Prepara UPSERT em massa (Ativando as peças que vieram)
    const upsertRows = allItems.map(item => {
      const techId = techMap[item.technician_name_key];
      if (!techId) return null;
      return {
        technician_id: techId,
        item_code: String(item.item_code).trim(),
        item_name: String(item.item_name).trim(),
        item_quantity: parseInt(item.item_quantity) || 0,
        item_num_remessa: String(item.item_num_remessa || '').trim(),
        active: true, // Força ativo
        synced_at: syncedAt, 
        sync_batch_id: batchId, 
        updated_at: syncedAt
      };
    }).filter(Boolean);

    // Salva em lotes de 500
    for (let i = 0; i < upsertRows.length; i += 500) {
      const chunk = upsertRows.slice(i, i + 500);
      await supabase.from('technician_items').upsert(chunk, { onConflict: 'technician_id,item_code' });
    }

    // E. Finaliza log com sucesso
    await supabase.from('datalake_sync_log').update({
      status: 'success', finished_at: new Date().toISOString(),
      technicians_total: techs.length, technicians_ok: techs.length, items_upserted: upsertRows.length
    }).eq('id', logRow.id);

    return NextResponse.json({ 
      ok: true, status: 'success', items_upserted: upsertRows.length, batch_id: batchId 
    });

  } catch (err) {
    await supabase.from('datalake_sync_log').update({
      status: 'failed', finished_at: new Date().toISOString(), error_message: err.message
    }).eq('id', logRow.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
