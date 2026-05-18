import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
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
    
    const isSupervisor = session.user.role === 'supervisor';
    const isCoordinator = session.user.role === 'coordinator';
    const isAdmin = session.user.role === 'admin';

    if (isSupervisor || isCoordinator) {
      // REGRA ESPECIAL SP: Se filtrar por SP, permite ver todos de SP.
      if (region === 'SP') {
        query = query.eq('region', 'SP');
      } 
      // Caso contrário, aplica a restrição de dono do técnico
      else {
        if (isSupervisor) {
          query = query.ilike('supervisor_name', session.user.name);
        } else if (isCoordinator) {
          query = query.ilike('coordinator_name', session.user.name);
        }
      }
    }

    /* ─── Filtros Adicionais (Busca e Região) ───────────────── */

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Filtro de Região: Aplicamos se não for a regra especial de SP (que já filtrou acima)
    // Para Admin, sempre aplicamos o filtro de região se ele existir
    if (region) {
      if (isAdmin || region !== 'SP') {
        query = query.eq('region', region);
      }
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

export async function POST(request) {
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
      supervisor_name: body.supervisor_name || null,
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
    console.error('API Post Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
