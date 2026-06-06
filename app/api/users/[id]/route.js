import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateUser } from '@/lib/db';

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // No Next.js 15+, params deve ser aguardado ou acessado via context.params
    const params = await context.params;
    const id = params.id;

    if (!id || id === 'undefined') {
      return NextResponse.json({ error: 'ID do usuário inválido ou não fornecido' }, { status: 400 });
    }

    const body = await request.json();
    const fields = {};

    if (body.name) fields.name = body.name;
    if (body.email) fields.email = body.email;
    if (body.role) fields.role = body.role;
    if (body.active !== undefined) fields.active = body.active;
    if ('linked_to' in body) fields.linked_to = body.linked_to || null;
    
    if (body.password && body.password.trim() !== '') {
      fields.password_hash = await bcrypt.hash(body.password, 10);
    }

    fields.updated_at = new Date().toISOString();

    const data = await updateUser(id, fields);
    
    if (!data) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('API Users PATCH Error:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no servidor' }, { status: 500 });
  }
}
