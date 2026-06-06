import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../../auth/[...nextauth]/route';
import { updateDivergenceStatus } from '@/lib/db';

export async function PATCH(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const data = await updateDivergenceStatus(params.id, {
    status:        body.status,
    ticket_number: body.ticket_number,
    ticket_note:   body.ticket_note,
  });
  return NextResponse.json(data);
}
