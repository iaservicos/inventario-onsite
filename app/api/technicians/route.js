// CAMINHO: app/api/technicians/route.js

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
    const active = searchParams.get('active');

    const supabase = createServiceClient();

    let query = supabase
      .from('technicians')
      .select('*')
      .order('name');

    if (active === 'true') {
      query = query.eq('active', true);
    } else if (active === 'false') {
      query = query.eq('active', false);
    }

    const isSupervisor = session.user.role === 'supervisor';
    const isCoordinator = session.user.role === 'coordinator';
    const isAdmin = session.user.role === 'admin';

    if (isSupervisor || isCoordinator) {
      if (region === 'SP') {
        query = query.eq('region', 'SP');
      } else {
        if (isSupervisor) {
          query = query.ilike('supervisor_name', session.user.name);
        } else if (isCoordinator) {
          query = query.ilike('coordinator_name', session.user.name);
        }
      }
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }

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
      active: body.active !== undefined ? body.active : true,
      inventory_day: body.inventory_day !== undefined ? body.inventory_day : null,
      inventory_time: body.inventory_time || '09:00'
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
