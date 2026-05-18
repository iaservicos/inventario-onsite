/**
 * app/api/technician-items/route.js
 *
 * Busca as peças de um técnico.
 * FONTE: tabela technician_items no Supabase (atualizada diariamente às 08h pelo job de sync).
 * Muito mais rápido que consultar o Databricks diretamente a cada acesso.
 *
 * GET /api/technician-items?technicianId=42
 *   Retorna as peças ativas do técnico + metadados da última sincronização.
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

    // 1. Verifica se o técnico existe
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }

    // 2. Busca peças ativas do técnico no Supabase (já sincronizadas do Datalake)
    const { data: items, error: itemsError } = await supabase
      .from('technician_items')
      .select('id, item_code, item_name, item_quantity, item_num_remessa, synced_at, sync_batch_id, active')
      .eq('technician_id', technicianId)
      .eq('active', true)
      .order('item_code', { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // 3. Busca metadados da última sincronização bem-sucedida
    const { data: lastSync } = await supabase
      .from('v_last_datalake_sync')
      .select('finished_at, formatted_at, status, items_upserted')
      .maybeSingle();

    // 4. Mapeia para o formato esperado pela UI (compatível com a versão anterior)
    const mappedData = (items || []).map(item => ({
      id:               item.id,
      item_code:        item.item_code,
      item_name:        item.item_name,
      item_quantity:    item.item_quantity,
      item_num_remessa: item.item_num_remessa,
      active:           item.active,
      synced_at:        item.synced_at,
      from_databricks:  false,   // agora vem do Supabase local
      from_cache:       true,
    }));

    return NextResponse.json({
      items: mappedData,
      last_sync: lastSync || null,
      total: mappedData.length,
    });

  } catch (error) {
    console.error('Erro ao buscar itens:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
