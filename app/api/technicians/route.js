import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getScopeFilter } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Permitir admin, supervisor, coordinator, e analyst para cadastrar técnicos
    if (!['admin', 'supervisor', 'coordinator', 'analyst'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    const cleanData = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      region: body.region || null,
      supervisor_name: body.supervisor_name || session.user.name,
      coordinator_name: body.coordinator_name || null,
      active: body.active !== undefined ? body.active : true
    };

    const { data, error } = await supabase
      .from('technicians')
      .insert(cleanData)
      .select()
      .single();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('API POST technicians error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search') || '';

    const scope = await getScopeFilter(session);
    if (scope !== null && scope.length === 0) return NextResponse.json([]);

    const supabase = createServiceClient();
    let query = supabase.from('technicians').select('*').order('name', { ascending: true });

    if (active === 'true') query = query.eq('active', true);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    if (scope !== null) query = query.in('id', scope);

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
