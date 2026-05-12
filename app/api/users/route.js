import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authOptions } from @/app/api/auth/[...nextauth]/route;
import { getAllUsers, createUser } from '@/lib/db';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const data = await getAllUsers();
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { name, email, password, role } = await request.json();
  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const data = await createUser({ name, email, password_hash, role });
  return NextResponse.json(data, { status: 201 });
}
