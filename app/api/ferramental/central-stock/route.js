import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function checkAuth(session) {
  return session && ['admin', 'analista_custo'].includes(session.user.role);
}

export async function GET() {
  try {
    const supabase = createServiceClient();

    const [{ data: tools }, { data: stock }] = await Promise.all([
      supabase.from('ferramental_tools').select('*').eq('active', true).order('id'),
      supabase.from('ferramental_central_stock').select('*').order('branch_name'),
    ]);

    // Agrega: para cada ferramenta, traz todos os registros de filial
    const byTool = (tools || []).map(tool => ({
      tool_id:    tool.id,
      tool_name:  tool.name,
      tool_notes: tool.notes,
      branches:   (stock || []).filter(s => s.tool_id === tool.id),
    }));

    return NextResponse.json(byTool);
  } catch (err) {
    console.error('[CENTRAL-STOCK GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!await checkAuth(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { tool_id, branch_name, quantity, storage_location, notes } = body;

    if (!tool_id || !branch_name?.trim()) {
      return NextResponse.json({ error: 'tool_id e branch_name obrigatórios' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_central_stock')
      .upsert(
        {
          tool_id,
          branch_name:      branch_name.trim(),
          quantity:         quantity ?? 0,
          storage_location: storage_location?.trim() || null,
          notes:            notes?.trim() || null,
          updated_at:       new Date().toISOString(),
          updated_by:       session.user.name,
        },
        { onConflict: 'tool_id,branch_name' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[CENTRAL-STOCK POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!await checkAuth(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

    const supabase = createServiceClient();
    const { error } = await supabase.from('ferramental_central_stock').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[CENTRAL-STOCK DELETE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
