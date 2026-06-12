import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function PATCH(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { status, approval_notes, analyst_notes, technician_id, delivery_method, tracking_code } = body;

    const GESTOR_STATUSES = ['aprovado', 'reprovado'];
    const ANALISTA_STATUSES = ['aguardando_envio', 'enviando', 'pendente', 'aguardando_compra', 'cancelado', 'entregue'];

    const isGestor = ['admin', 'supervisor'].includes(session.user.role);
    const isAnalista = session.user.role === 'analista_custo' || session.user.role === 'admin';

    if (GESTOR_STATUSES.includes(status) && !isGestor) {
      return NextResponse.json({ error: 'Apenas gestores podem aprovar/reprovar' }, { status: 403 });
    }
    if (ANALISTA_STATUSES.includes(status) && !isAnalista) {
      return NextResponse.json({ error: 'Apenas analistas podem atualizar este status' }, { status: 403 });
    }

    const supabase = createServiceClient();

    const fields = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (approval_notes !== undefined) fields.approval_notes = approval_notes;
    if (analyst_notes !== undefined) fields.analyst_notes = analyst_notes;
    if (technician_id !== undefined) fields.technician_id = technician_id || null;
    if (delivery_method !== undefined) fields.delivery_method = delivery_method || null;
    if (tracking_code !== undefined) fields.tracking_code = tracking_code?.trim() || null;

    if (GESTOR_STATUSES.includes(status)) {
      fields.approved_by = session.user.name;
      fields.approved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('ferramental_requests')
      .update(fields)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await supabase.from('ferramental_request_history').insert({
      request_id: parseInt(id),
      status,
      changed_by: session.user.name,
      notes:      approval_notes || analyst_notes || null,
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('[FERRAMENTAL/REQUESTS PATCH]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(_, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { id } = params;
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_requests')
      .select('*, technicians(id, name, region, supervisor_name), ferramental_request_history(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[FERRAMENTAL/REQUESTS GET ID]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
