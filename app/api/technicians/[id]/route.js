import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

// GET /api/technicians/[id] — busca técnico por ID
export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { id } = params;
  const { data, error } = await supabase
    .from('technicians')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Supervisor só pode ver seus próprios técnicos
  if (session.user.role === 'supervisor') {
    const supervisorName = session.user.name;
    if (data.supervisor_name?.toLowerCase() !== supervisorName?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(data);
}

// PATCH /api/technicians/[id] — atualiza técnico (supervisor edita campos básicos, admin edita tudo)
export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { id } = params;
  const body = await request.json();

  // Busca técnico para validar permissão
  const { data: existing } = await supabase
    .from('technicians')
    .select('id, name, supervisor_name')
    .eq('id', id)
    .single();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Supervisor só pode editar seus próprios técnicos
  if (session.user.role === 'supervisor') {
    const supervisorName = session.user.name;
    if (existing.supervisor_name?.toLowerCase() !== supervisorName?.toLowerCase()) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    // Supervisor não pode alterar campos restritos
    delete body.active;
    delete body.supervisor_name;
    delete body.databricks_name;
    delete body.databricks_id;
    delete body.role;
  }

  // Campos permitidos para atualização
  const allowedFields = ['name', 'phone', 'email', 'region'];
  if (session.user.role === 'admin') {
    allowedFields.push('active', 'supervisor_name', 'databricks_name', 'databricks_id');
  }

  const updateData = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) updateData[field] = body[field];
  }
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('technicians')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/technicians/[id] — apenas admin pode excluir
export async function DELETE(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden — apenas administradores podem excluir técnicos' }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { id } = params;

  // Verifica se técnico tem inventários vinculados
  const { count } = await supabase
    .from('inventories')
    .select('id', { count: 'exact', head: true })
    .eq('technician_id', id);

  if (count > 0) {
    // Não exclui fisicamente — inativa para preservar histórico
    const { data, error } = await supabase
      .from('technicians')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ...data, _inactivated: true, message: 'Técnico inativado pois possui inventários vinculados' });
  }

  const { error } = await supabase
    .from('technicians')
    .delete()
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
