/**
 * POST /api/technicians/[id]/sync-items
 * Sincroniza o portfólio de peças de um técnico buscando dados em tempo real do Databricks.
 * Pode ser chamado manualmente pelo supervisor ou automaticamente antes de disparar inventário.
 *
 * Body (opcional):
 *   { mode: "full" | "sample", count: 10 }
 *   - full: sincroniza TODO o portfólio (pode ser lento para técnicos com 1000+ peças)
 *   - sample: seleciona N peças aleatórias (default, recomendado para inventário semanal)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from ''@/app/api/auth/[...nextauth]/route'';
import { createClient } from '@supabase/supabase-js';
import { getTechnicianItems, getTechnicianItemsSample, verifyTechnicianInDatabricks } from '@/lib/databricks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const technicianId = parseInt(params.id);
  const body = await request.json().catch(() => ({}));
  const mode = body.mode || 'sample';
  const count = parseInt(body.count) || 10;

  // Busca o técnico no banco
  const { data: technician, error: techError } = await supabase
    .from('technicians')
    .select('id, name, databricks_name, active')
    .eq('id', technicianId)
    .single();

  if (techError || !technician) {
    return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
  }

  if (!technician.active) {
    return NextResponse.json({ error: 'Técnico inativo' }, { status: 400 });
  }

  // Usa databricks_name se definido, senão usa o nome cadastrado
  const searchName = technician.databricks_name || technician.name;

  // Verifica se o técnico existe no Databricks
  let verification;
  try {
    verification = await verifyTechnicianInDatabricks(searchName);
  } catch (e) {
    return NextResponse.json({
      error: `Erro ao conectar ao Databricks: ${e.message}`,
      hint: 'Verifique as variáveis DATABRICKS_HOST, DATABRICKS_TOKEN e DATABRICKS_WAREHOUSE_ID'
    }, { status: 500 });
  }

  if (!verification.found) {
    return NextResponse.json({
      error: `Técnico "${searchName}" não encontrado no Databricks`,
      hint: 'Verifique se o nome cadastrado no sistema corresponde exatamente ao nome no Data Lake. Use o campo "Nome no Databricks" para ajustar se necessário.',
      searched_name: searchName,
    }, { status: 404 });
  }

  // Busca as peças
  let items;
  try {
    if (mode === 'full') {
      items = await getTechnicianItems(searchName);
    } else {
      items = await getTechnicianItemsSample(searchName, count);
    }
  } catch (e) {
    return NextResponse.json({ error: `Erro ao buscar peças: ${e.message}` }, { status: 500 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({
      error: 'Nenhuma peça encontrada para este técnico no Databricks',
      searched_name: searchName,
    }, { status: 404 });
  }

  if (mode === 'full') {
    // Modo full: substitui todo o portfólio no banco
    // Remove as peças antigas
    await supabase
      .from('technician_items')
      .delete()
      .eq('technician_id', technicianId)
      .eq('source', 'databricks');

    // Insere as novas peças
    const rows = items.map((item) => ({
      technician_id: technicianId,
      item_code: item.item_code,
      item_name: item.item_name,
      unit: item.unit,
      expected_qty: item.expected_qty,
      active: true,
      source: 'databricks',
      synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from('technician_items')
      .insert(rows);

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Atualiza o técnico com data de última sincronização
    await supabase
      .from('technicians')
      .update({
        databricks_synced_at: new Date().toISOString(),
        databricks_total_items: verification.total_items,
        databricks_name: verification.databricks_name,
      })
      .eq('id', technicianId);

    return NextResponse.json({
      ok: true,
      mode: 'full',
      technician_name: technician.name,
      databricks_name: verification.databricks_name,
      total_in_databricks: verification.total_items,
      synced_items: items.length,
    });

  } else {
    // Modo sample: retorna as peças sem salvar no banco
    // (serão usadas diretamente ao criar o inventário)
    return NextResponse.json({
      ok: true,
      mode: 'sample',
      technician_name: technician.name,
      databricks_name: verification.databricks_name,
      total_in_databricks: verification.total_items,
      sample_count: items.length,
      items,
    });
  }
}

/**
 * GET /api/technicians/[id]/sync-items
 * Verifica se o técnico existe no Databricks e quantas peças tem
 */
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const technicianId = parseInt(params.id);

  const { data: technician, error } = await supabase
    .from('technicians')
    .select('id, name, databricks_name, databricks_synced_at, databricks_total_items')
    .eq('id', technicianId)
    .single();

  if (error || !technician) {
    return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
  }

  const searchName = technician.databricks_name || technician.name;

  try {
    const verification = await verifyTechnicianInDatabricks(searchName);
    return NextResponse.json({
      technician_id: technicianId,
      technician_name: technician.name,
      databricks_name: verification.databricks_name || searchName,
      found_in_databricks: verification.found,
      total_items: verification.total_items,
      last_synced_at: technician.databricks_synced_at,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
