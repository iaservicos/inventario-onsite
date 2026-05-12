import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateUser } from '@/lib/db';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const fields = {};

  if (body.name) fields.name = body.name;
  if (body.email) fields.email = body.email;
  if (body.role) fields.role = body.role;
  if (body.active !== undefined) fields.active = body.active;
  if (body.password) fields.password_hash = await bcrypt.hash(body.password, 10);

  const data = await updateUser(params.id, fields);
  return NextResponse.json(data);
}
