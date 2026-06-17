import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const inventoryId = parseInt(params.id);

  // Verifica se o inventário passou por recontagem (usa * para não errar se coluna não existir)
  const { data: inv } = await supabase
    .from('inventories')
    .select('*')
    .eq('id', inventoryId)
    .maybeSingle();
  const isRecount = inv?.is_recount === true;

  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, item_code, item_name, item_subgroup, system_qty, physical_qty, status, has_divergence, counted_at')
    .eq('inventory_id', inventoryId)
    .order('counted_at', { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let rows = data || [];

  // Se houve recontagem: exclui itens com system_qty=0 (escaneados errado na 1ª contagem,
  // não estão no sistema e não foram indicados na recontagem)
  if (isRecount) {
    rows = rows.filter(item => Number(item.system_qty || 0) > 0 || item.physical_qty === null);
  }

  // Deduplica por código normalizado (sem zeros à esquerda), mantendo o mais recente
  const normalize = (c) => String(c || '').replace(/^0+/, '') || '0';
  const map = {};
  for (const item of rows) {
    const key = normalize(item.item_code);
    if (!map[key]) map[key] = item; // já ordenado por counted_at desc → primeiro = mais recente
  }

  const deduped = Object.values(map).sort((a, b) => {
    const sa = a.has_divergence ? 2 : a.physical_qty === null ? 1 : 0;
    const sb = b.has_divergence ? 2 : b.physical_qty === null ? 1 : 0;
    if (sa !== sb) return sb - sa;
    return (a.item_name || '').localeCompare(b.item_name || '', 'pt-BR');
  });

  return NextResponse.json(deduped);
}
