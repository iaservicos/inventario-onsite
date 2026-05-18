import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const region = searchParams.get('region') || '';

    const supabase = createServiceClient();

    let query = supabase
      .from('technicians')
      .select('*')
      .order('name');

    /* ─── Regra de Visibilidade por Perfil ──────────────────── */
    
    if (session.user.role === 'supervisor') {
      // REGRA ESPECIAL SP: Se o filtro for SP, permite ver todos de SP. 
      // Caso contrário, vê apenas os seus.
      if (region === 'SP') {
        query = query.eq('region', 'SP');
      } else {
        query = query.ilike('supervisor_name', session.user.name);
      }
    }

    /* ─── Filtros de Busca e Região ─────────────────────────── */

    if (search) {
      // Busca por nome ou e-mail
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (region && region !== 'SP') {
      // Se não for SP (que já tratamos na regra de supervisor), aplica o filtro de região
      query = query.eq('region', region);
    }

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
    
    const isAdmin = session.user.role === 'admin';
    const isCoordinator = session.user.role === 'coordinator';

    const params = await context.params;
    const { id } = params;
    
    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID do técnico inválido' }, { status: 400 });
    }

    const body = await request.json();
    const supabase = createServiceClient();

    // Validação de Permissão para Supervisor
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
