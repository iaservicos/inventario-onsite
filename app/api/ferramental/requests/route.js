import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const technicianId = searchParams.get('technician_id');

    const supabase = createServiceClient();
    let query = supabase
      .from('ferramental_requests')
      .select('*, technicians(id, name, region, supervisor_name)')
      .order('created_at', { ascending: false });

    if (status && status !== 'all') query = query.eq('status', status);
    if (technicianId) query = query.eq('technician_id', technicianId);

    // Supervisor only sees requests from their technicians
    if (session.user.role === 'supervisor') {
      const { data: techs } = await supabase
        .from('technicians')
        .select('id')
        .eq('supervisor_name', session.user.name);
      const ids = (techs || []).map(t => t.id);
      if (ids.length === 0) return NextResponse.json([]);
      query = query.in('technician_id', ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[FERRAMENTAL/REQUESTS GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST público (técnico) ou autenticado (entrega direta pelo gestor/analista)
export async function POST(req) {
  try {
    const body = await req.json();
    const { technician_name, technician_email, tool_id, comment, direct_delivery, technician_id } = body;

    const supabase = createServiceClient();

    // ── Entrega direta (gestor/analista registra entrega presencial) ──────────
    if (direct_delivery) {
      const session = await getServerSession(authOptions);
      if (!session || !['admin', 'supervisor', 'analista_custo'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
      }
      if (!tool_id) return NextResponse.json({ error: 'Ferramenta obrigatória' }, { status: 400 });

      const { data: tool } = await supabase
        .from('ferramental_tools')
        .select('id, name, default_quantity')
        .eq('id', tool_id)
        .eq('active', true)
        .single();
      if (!tool) return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });

      let techName = technician_name || '';
      let techEmail = technician_email || '';
      if (technician_id && !techName) {
        const { data: t } = await supabase.from('technicians').select('name, email').eq('id', technician_id).single();
        if (t) { techName = t.name; techEmail = t.email || ''; }
      }

      const { data: request, error } = await supabase
        .from('ferramental_requests')
        .insert({
          requester_type:   'admin',
          technician_name:  techName,
          technician_email: techEmail?.toLowerCase() || '',
          technician_id:    technician_id || null,
          tool_id:          tool.id,
          tool_name:        tool.name,
          quantity:         body.quantity || tool.default_quantity,
          comment:          comment?.trim() || null,
          status:           'entregue',
          approved_by:      session.user.name,
          approved_at:      new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from('ferramental_request_history').insert({
        request_id: request.id,
        status:     'entregue',
        changed_by: session.user.name,
        notes:      'Entrega direta registrada pelo gestor/analista',
      });

      return NextResponse.json({ id: request.id }, { status: 201 });
    }

    // ── Fluxo público — técnico solicita ─────────────────────────────────────
    if (!technician_name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
    if (!technician_email?.trim()) return NextResponse.json({ error: 'E-mail obrigatório' }, { status: 400 });
    if (!tool_id) return NextResponse.json({ error: 'Ferramenta obrigatória' }, { status: 400 });

    const { data: tool } = await supabase
      .from('ferramental_tools')
      .select('id, name, default_quantity')
      .eq('id', tool_id)
      .eq('active', true)
      .single();
    if (!tool) return NextResponse.json({ error: 'Ferramenta não encontrada' }, { status: 404 });

    const { data: tech } = await supabase
      .from('technicians')
      .select('id')
      .ilike('email', technician_email.trim())
      .maybeSingle();

    const { data: request, error } = await supabase
      .from('ferramental_requests')
      .insert({
        requester_type:   'technician',
        technician_name:  technician_name.trim(),
        technician_email: technician_email.trim().toLowerCase(),
        technician_id:    tech?.id || null,
        tool_id:          tool.id,
        tool_name:        tool.name,
        quantity:         body.quantity || tool.default_quantity,
        comment:          comment?.trim() || null,
        status:           'aguardando_aprovacao',
      })
      .select()
      .single();
    if (error) throw error;

    await supabase.from('ferramental_request_history').insert({
      request_id: request.id,
      status:     'aguardando_aprovacao',
      changed_by: technician_name.trim(),
      notes:      'Solicitação criada pelo técnico',
    });

    return NextResponse.json({ id: request.id }, { status: 201 });
  } catch (err) {
    console.error('[FERRAMENTAL/REQUESTS POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
