import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getInventoryKPIs, getInventories, getAlerts, getScopeFilter } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const technicianId = searchParams.get('technicianId') || '';

  const scope = await getScopeFilter(session);

  const [kpis, recent, alerts] = await Promise.all([
    getInventoryKPIs({ from, to, technicianId, technicianIds: scope }),
    getInventories({ from, to, technicianId, limit: 8, technicianIds: scope }),
    getAlerts({ resolved: false, technicianIds: scope }),
  ]);

  return NextResponse.json({ kpis, recent, alerts });
}
