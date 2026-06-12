import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

async function checkAuth(session) {
  return session && ['admin', 'supervisor', 'analista_custo'].includes(session.user.role);
}

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!await checkAuth(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const technicianId = searchParams.get('technician_id');
    if (!technicianId) return NextResponse.json({ error: 'technician_id obrigatório' }, { status: 400 });

    const supabase = createServiceClient();

    // Retorna todas as ferramentas do catálogo com a quantidade que o técnico tem
    const [{ data: tools }, { data: inventory }] = await Promise.all([
      supabase.from('ferramental_tools').select('*').eq('active', true).order('id'),
      supabase.from('ferramental_technician_inventory').select('*').eq('technician_id', technicianId),
    ]);

    const inventoryMap = new Map((inventory || []).map(i => [i.tool_id, i]));

    const result = (tools || []).map(tool => ({
      tool_id:      tool.id,
      tool_name:    tool.name,
      tool_notes:   tool.notes,
      default_qty:  tool.default_quantity,
      inventory_id: inventoryMap.get(tool.id)?.id || null,
      quantity:     inventoryMap.get(tool.id)?.quantity ?? 0,
      updated_at:   inventoryMap.get(tool.id)?.updated_at || null,
      updated_by:   inventoryMap.get(tool.id)?.updated_by || null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error('[FERRAMENTAL/INVENTORY GET]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!await checkAuth(session)) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });

    const body = await req.json();
    const { technician_id, tool_id, quantity } = body;

    if (!technician_id || !tool_id) {
      return NextResponse.json({ error: 'technician_id e tool_id obrigatórios' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_technician_inventory')
      .upsert(
        {
          technician_id,
          tool_id,
          quantity:   quantity ?? 0,
          updated_at: new Date().toISOString(),
          updated_by: session.user.name,
        },
        { onConflict: 'technician_id,tool_id' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error('[FERRAMENTAL/INVENTORY POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
