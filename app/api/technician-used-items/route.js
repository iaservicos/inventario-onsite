/**
 * app/api/technician-used-items/route.js
 *
 * Busca as peças USADAS de um técnico.
 * FONTE: tabela technician_used_items no Supabase (sincronizada do Datalake).
 *
 * GET /api/technician-used-items?technicianId=42
 */

import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');

    if (!technicianId) {
      return NextResponse.json({ error: 'TechnicianId obrigatório' }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }

    const { data: items, error: itemsError } = await supabase
      .from('technician_used_items')
      .select('id, item_code, item_name, item_subgroup, item_quantity, item_num_remessa, atp_centro, atp_nome, status_consumo, chamado_consumo, data_encerramento, synced_at, sync_batch_id, active')
      .eq('technician_id', technicianId)
      .eq('active', true)
      .order('item_code', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Última sincronização de peças usadas (batch_id começa com 'sync-usadas-')
    const { data: lastSyncRaw } = await supabase
      .from('datalake_sync_log')
      .select('finished_at, status, items_upserted')
      .like('batch_id', 'sync-usadas-%')
      .eq('status', 'success')
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const lastSync = lastSyncRaw
      ? {
          ...lastSyncRaw,
          formatted_at: lastSyncRaw.finished_at
            ? new Date(lastSyncRaw.finished_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
            : null,
        }
      : null;

    const mappedData = (items || []).map(item => ({
      id:                item.id,
      item_code:         item.item_code,
      item_name:         item.item_name,
      item_subgroup:     item.item_subgroup,
      item_quantity:     item.item_quantity,
      item_num_remessa:  item.item_num_remessa,
      atp_centro:        item.atp_centro,
      atp_nome:          item.atp_nome,
      status_consumo:    item.status_consumo,
      chamado_consumo:   item.chamado_consumo,
      data_encerramento: item.data_encerramento,
      active:            item.active,
      synced_at:         item.synced_at,
      from_cache:        true,
    }));

    return NextResponse.json({ items: mappedData, last_sync: lastSync, total: mappedData.length });

  } catch (error) {
    console.error('Erro ao buscar peças usadas:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
