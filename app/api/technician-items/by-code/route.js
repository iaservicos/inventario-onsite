/**
 * GET /api/technician-items/by-code?code=XXXX
 * Retorna todos os tecnicos que possuem determinado codigo de peca (novas).
 */
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const code = (searchParams.get('code') || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'code obrigatorio' }, { status: 400 });

  const supabase = createServiceClient();

  const { data: rows, error } = await supabase
    .from('technician_items')
    .select('item_code, item_name, item_subgroup, item_quantity, item_num_remessa, atp_centro, atp_nome, technician_id, technicians(id, name, region, supervisor_name)')
    .ilike('item_code', `%${code}%`)
    .eq('active', true)
    .order('item_quantity', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const result = (rows || []).map(r => ({
    item_code:       r.item_code,
    item_name:       r.item_name,
    item_subgroup:   r.item_subgroup,
    item_quantity:   r.item_quantity,
    item_num_remessa: r.item_num_remessa,
    atp_centro:      r.atp_centro,
    atp_nome:        r.atp_nome,
    technician_id:   r.technician_id,
    technician_name: r.technicians?.name,
    technician_region: r.technicians?.region,
    supervisor_name: r.technicians?.supervisor_name,
  }));

  const total_quantity = result.reduce((s, r) => s + (r.item_quantity || 0), 0);

  return NextResponse.json({ results: result, total: result.length, total_quantity });
}
