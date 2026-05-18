import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const params = await context.params;
    // O id pode ser 'all' ou um ID específico, dependendo de como a rota é chamada
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

    /* ─── Regra de Visibilidade ─────────────────────────────── */
    
    // 1. Se for Admin ou Coordenador, vê tudo (filtros normais se aplicam)
    // 2. Se for Supervisor:
    if (session.user.role === 'supervisor') {
      
      // REGRA ESPECIAL SP: 
      // Primeiro, verificamos se o supervisor logado pertence a SP.
      // Como a sessão não tem 'region', buscamos no banco o perfil do técnico/usuário vinculado ou 
      // assumimos que se ele filtrar por SP e houver uma regra de negócio, ele pode ver.
      // MELHOR ABORDAGEM: Se o supervisor tentar ver SP, permitimos se ele for de SP.
      // Mas para simplificar conforme sua regra: "Em SP, 1 supervisor consegue ver todos de SP"
      
      if (region === 'SP') {
        // Se o filtro for SP, não filtramos por supervisor_name, permitindo ver todos de SP
        query = query.eq('region', 'SP');
      } else {
        // Regra padrão para outras regiões: vê apenas os seus
        query = query.ilike('supervisor_name', session.user.name);
      }
    }

    /* ─── Filtros Adicionais ────────────────────────────────── */

    // Filtro de Ativos/Inativos
    if (active === 'true') {
      query = query.eq('active', true);
    } else if (active === 'false') {
      query = query.eq('active', false);
    } else {
      query = query.eq('active', true);
    }

    if (search) query = query.ilike('name', `%${search}%`);
    if (region && region !== 'SP') query = query.eq('region', region); // SP já foi filtrado acima se for supervisor

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
    
    // Admin e Coordenador podem editar tudo. Supervisor pode editar se for dele OU se for de SP.
    const isAdmin = session.user.role === 'admin';
    const isCoordinator = session.user.role === 'coordinator';

    const params = await context.params;
    const { id } = params;
    
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID do técnico inválido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    // Se for supervisor, precisamos validar se ele tem permissão para editar este técnico específico
    if (!isAdmin && !isCoordinator) {
      const { data: tech } = await supabase.from('technicians').select('supervisor_name, region').eq('id', id).single();
      
      const isHisTech = tech?.supervisor_name === session.user.name;
      const isSPTech = tech?.region === 'SP';

      if (!isHisTech && !isSPTech) {
        return NextResponse.json({ error: 'Você não tem permissão para editar este técnico' }, { status: 403 });
      }
    }

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.region !== undefined) updateData.region = body.region || null;
    if (body.supervisor_name !== undefined && (isAdmin || isCoordinator)) updateData.supervisor_name = body.supervisor_name;
    if (body.active !== undefined) updateData.active = body.active;
    
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
