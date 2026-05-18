import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';
    const active = searchParams.get('active');

    const supabase = createServiceClient();

    // Otimização: Selecionar apenas as colunas necessárias para a tabela e limitar o resultado
    let query = supabase
      .from('technicians')
      .select('id, name, email, phone, region, active, supervisor_name, datalake_status')
      .order('name');

    // Filtro de Supervisor
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

    // Retorna os dados com cabeçalho de cache para o navegador
    return new NextResponse(JSON.stringify(data || []), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, max-age=60, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    console.error('API Error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const supabase = createServiceClient();
    
    const { data, error } = await supabase
      .from('technicians')
      .insert(body)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
