/**
 * app/api/sync/pecas/route.js
 * VERSÃO: 5.0.0 (CLEAN & LOAD - Garantia Total)
 * 
 * Esta versão DELETA as peças antigas e INSERE as novas do zero.
 * É a solução mais robusta para garantir que os dados ativos reflitam o Datalake.
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

  // 1. Log inicial
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
      throw new Error('O Databricks não retornou nenhuma peça. Verifique os filtros no Datalake.');
    }

    // C. ESTRATÉGIA DE LIMPEZA (DELETE REAL)
    // Removemos todas as peças atuais para garantir que não haja lixo ou status 'false' preso.
    const { error: delError } = await supabase
      .from('technician_items')
      .delete()
      .in('technician_id', techIds);

    if (delError) throw new Error(`Erro ao limpar banco: ${delError.message}`);

    // D. CARGA TOTAL (INSERT)
    const insertRows = allItems.map(item => {
      const techId = techMap[item.technician_name_key];
      if (!techId) return null;
      return {
        technician_id: techId,
        item_code: String(item.item_code).trim(),
        item_name: String(item.item_name).trim(),
        item_quantity: parseInt(item.item_quantity) || 0,
        item_num_remessa: String(item.item_num_remessa || '').trim(),
        active: true,
        synced_at: syncedAt, 
        sync_batch_id: batchId, 
        updated_at: syncedAt,
        unit: 'un'
      };
    }).filter(Boolean);

    // Insere em lotes de 500 para performance
    for (let i = 0; i < insertRows.length; i += 500) {
      const chunk = insertRows.slice(i, i + 500);
      const { error: insError } = await supabase.from('technician_items').insert(chunk);
      if (insError) throw new Error(`Erro ao inserir peças: ${insError.message}`);
    }

    // E. Finaliza log com sucesso
    await supabase.from('datalake_sync_log').update({
      status: 'success', finished_at: new Date().toISOString(),
      technicians_total: techs.length, technicians_ok: techs.length, items_upserted: insertRows.length
    }).eq('id', logRow.id);

    return NextResponse.json({ 
      ok: true, status: 'success', total_gravado: insertRows.length, batch_id: batchId 
    });

  } catch (err) {
    await supabase.from('datalake_sync_log').update({
      status: 'failed', finished_at: new Date().toISOString(), error_message: err.message
    }).eq('id', logRow.id);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
