import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    const { id } = params;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';
    const active = searchParams.get('active');

    const supabase = createServiceClient();

    let query = supabase
      .from('technicians')
      .select('*')
      .order('name');

    // Filtro de Supervisor (Apenas se não for admin)
    if (session.user.role === 'supervisor') {
      query = query.ilike('supervisor_name', session.user.name);
    }

    // Filtro de Ativos/Inativos
    if (active === 'true') {
      query = query.eq('active', true);
    } else if (active === 'false') {
      query = query.eq('active', false);
    } else {
      query = query.eq('active', true);
    }

    if (search) query = query.ilike('name', `%${search}%`);
    if (region) query = query.eq('region', region);

    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const supabase = createServiceClient();
    
    // Limpeza de dados para evitar erros de tipo no Postgres
    const cleanData = {
      name: body.name,
      email: body.email || null,
      phone: body.phone || null,
      region: body.region || null,
      supervisor_name: body.supervisor_name || session.user.name,
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
    console.error('API Post Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const params = await context.params;
    const { id } = params;
    
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID do técnico inválido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    // Construir objeto de atualização apenas com campos fornecidos
    const updateData = {};
    
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.region !== undefined) updateData.region = body.region || null;
    if (body.supervisor_name !== undefined) updateData.supervisor_name = body.supervisor_name;
    if (body.active !== undefined) updateData.active = body.active;
    
    // Adicionar timestamp de atualização
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('technicians')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase Update Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    console.error('API PATCH Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
