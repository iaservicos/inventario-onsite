import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from @/app/api/auth/[...nextauth]/route;
import { getInventoryKPIs, getInventories, getAlerts } from '@/lib/db';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const technicianId = searchParams.get('technicianId') || '';

  const [kpis, recent, alerts] = await Promise.all([
    getInventoryKPIs({ from, to, technicianId }),
    getInventories({ from, to, technicianId, limit: 8 }),
    getAlerts({ resolved: false }),
  ]);

  return NextResponse.json({ kpis, recent, alerts });
}
