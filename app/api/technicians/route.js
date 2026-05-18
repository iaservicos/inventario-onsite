import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = createServiceClient();
    let query = supabase.from('technicians').select('*').order('name');
    if (session.user.role === 'supervisor') {
      query = query.ilike('supervisor_name', session.user.name);
    }
    const { data, error } = await query;
    if (error) return NextResponse.json([], { status: 200 });
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request, { params }) {
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
    const { data, error } = await supabase.from('technicians').insert(cleanData).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// NOVO MÉTODO PATCH PARA EDITAR
export async function PATCH(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    const body = await request.json();
    const supabase = createServiceClient();

    const updateData = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.region !== undefined) updateData.region = body.region || null;
    if (body.supervisor_name !== undefined) updateData.supervisor_name = body.supervisor_name;
    if (body.active !== undefined) updateData.active = body.active;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('technicians').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    return NextResponse.json(data, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
