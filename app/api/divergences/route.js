import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDivergences } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const data = await getDivergences({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    technicianId: searchParams.get('technicianId') || '',
    status: searchParams.get('status') || '',
  });

  return NextResponse.json(data);
}
