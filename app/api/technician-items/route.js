import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTechnicianItems, upsertTechnicianItems } from '@/lib/db-gptmaker';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId');
  if (!technicianId) return NextResponse.json({ error: 'technicianId obrigatório' }, { status: 400 });

  const data = await getTechnicianItems(technicianId, false);
  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { technician_id, items } = body;

  if (!technician_id || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'technician_id e items[] são obrigatórios' }, { status: 400 });
  }

  const data = await upsertTechnicianItems(technician_id, items);
  return NextResponse.json(data, { status: 201 });
}
