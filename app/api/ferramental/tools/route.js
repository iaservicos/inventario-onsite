import { createServiceClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_tools')
      .select('*')
      .eq('active', true)
      .order('id');
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('[FERRAMENTAL/TOOLS]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { getServerSession } = await import('next-auth');
    const { authOptions } = await import('@/app/api/auth/[...nextauth]/route');
    const session = await getServerSession(authOptions);
    if (!session || !['admin', 'analista_custo'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }
    const body = await req.json();
    const { name, default_quantity, notes } = body;
    if (!name?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('ferramental_tools')
      .insert({ name: name.trim(), default_quantity: default_quantity || 1, notes: notes || null })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[FERRAMENTAL/TOOLS POST]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
