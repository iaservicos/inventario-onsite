import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getInventories, createInventory, getScopeFilter } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = await getScopeFilter(session);

  const queryIds = searchParams.get('technicianIds')?.split(',').filter(Boolean) || null;
  const effectiveIds = queryIds
    ? (scope ? scope.filter(id => queryIds.includes(id)) : queryIds)
    : scope;

  const data = await getInventories({
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    technicianId: searchParams.get('technicianId') || '',
    status: searchParams.get('status') || '',
    technicianIds: effectiveIds,
  });

  return NextResponse.json(data);
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const data = await createInventory(body);
  return NextResponse.json(data, { status: 201 });
}
