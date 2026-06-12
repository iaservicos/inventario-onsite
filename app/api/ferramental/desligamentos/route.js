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

    const supabase = createServiceClient();
    let query = supabase
      .from('ferramental_desligamentos')
      .select('*, ferramental_devolucoes(*)')
      .order('created_at', { ascending: false });

    // Supervisor vê apenas desligamentos de seus técnicos
    if (session.user.role === 'supervisor') {
      const { data: techs } = await supabase
        .from('technicians').select('id').eq('supervisor_name', session.user.name);
      const ids = (techs || []).map(t => t.id);
      if (ids.length === 0) return NextResponse.json([]);
      query = query.in('technician_id', ids);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[DESLIGAMENTOS GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'supervisor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Apenas gestores podem registrar desligamentos' }, { status: 403 });
    }

    const body = await req.json();
    const { technician_id, technician_name, itens, notes } = body;

    if (!technician_name?.trim()) return NextResponse.json({ error: 'Técnico obrigatório' }, { status: 400 });
    if (!itens?.length) return NextResponse.json({ error: 'Informe ao menos uma ferramenta' }, { status: 400 });

    const supabase = createServiceClient();

    // Cria o desligamento
    const { data: deslig, error: dErr } = await supabase
      .from('ferramental_desligamentos')
      .insert({
        technician_id:  technician_id || null,
        technician_name: technician_name.trim(),
        status:         'aguardando_validacao',
        created_by:     session.user.name,
        notes:          notes?.trim() || null,
      })
      .select().single();

    if (dErr) throw dErr;

    // Cria os itens da devolução
    const rows = itens.map(item => ({
      desligamento_id:   deslig.id,
      tool_id:           item.tool_id || null,
      tool_name:         item.tool_name,
      tool_notes:        item.tool_notes || null,
      expected_quantity: item.expected_quantity,
      returned_quantity: item.returned_quantity,
      status:            'pendente',
    }));

    const { error: iErr } = await supabase.from('ferramental_devolucoes').insert(rows);
    if (iErr) throw iErr;

    return NextResponse.json({ id: deslig.id }, { status: 201 });
  } catch (err) {
    console.error('[DESLIGAMENTOS POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
