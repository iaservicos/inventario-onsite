import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createTechnician } from '@/lib/db';
import { createServiceClient } from '@/lib/supabase';

// GET /api/technicians — lista técnicos com filtro por perfil
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search  = searchParams.get('search') || '';
    const region  = searchParams.get('region') || '';
    const showAll = searchParams.get('active') === 'false'; // false = mostrar inativos também

    const supabase = createServiceClient();

    let query = supabase
      .from('technicians')
      .select('id, name, email, phone, region, active, supervisor_name, databricks_name, databricks_id, databricks_total_items, created_at, updated_at')
      .order('name');

    // Supervisor só vê seus técnicos
    if (session.user.role === 'supervisor') {
      query = query.ilike('supervisor_name', session.user.name);
    }

    // Admin pode ver inativos; supervisor só vê ativos
    if (!showAll || session.user.role === 'supervisor') {
      query = query.eq('active', true);
    }

    if (search) query = query.ilike('name', `%${search}%`);
    if (region) query = query.eq('region', region);

    const { data, error } = await query;
    
    if (error) {
      console.error('Erro Supabase:', error);
      return NextResponse.json([], { status: 200 }); // Retorna lista vazia em vez de erro 500 para não quebrar o front
    }
    
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('Erro na API de técnicos:', err);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/technicians — cria técnico (apenas admin)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const data = await createTechnician(body);
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
