import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const revalidate = 60; // cache de 60s — lista de técnicos raramente muda

// FUNÇÃO PARA LISTAR (Já existia)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const supabase = createServiceClient();
    let query = supabase
      .from('technicians')
      .select('*')
      .order('name', { ascending: true });

    if (active === 'true') {
      query = query.eq('active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Erro ao buscar técnicos:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// NOVA FUNÇÃO PARA SALVAR AS ALTERAÇÕES DO PAINEL
export async function PATCH(request) {
  try {
    const body = await request.json();
    
    // O painel envia um array de técnicos ou um objeto único
    const techniciansToUpdate = Array.isArray(body) ? body : [body];
    const supabase = createServiceClient();
    const results = [];

    for (const tech of techniciansToUpdate) {
      if (!tech.id) continue;

      const { data, error } = await supabase
        .from('technicians')
        .update({
          inventory_day: tech.inventory_day,
          inventory_time: tech.inventory_time,
          active: tech.active,
          updated_at: new Date().toISOString()
        })
        .eq('id', tech.id)
        .select()
        .single();

      if (error) {
        console.error(`Erro ao atualizar técnico ${tech.id}:`, error);
        results.push({ id: tech.id, status: 'error', message: error.message });
      } else {
        results.push({ id: tech.id, status: 'success', data });
      }
    }

    return NextResponse.json({ message: 'Processamento concluído', results });
  } catch (err) {
    console.error('Erro no PATCH technicians:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
