import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCountHistory, getScopeFilter } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const scope = await getScopeFilter(session);

  const data = await getCountHistory({
    from:          searchParams.get('from')          || '',
    to:            searchParams.get('to')            || '',
    technicianId:  searchParams.get('technicianId')  || '',
    inventoryId:   searchParams.get('inventoryId')   || '',
    technicianIds: scope,
  });

  return NextResponse.json(data);
}
