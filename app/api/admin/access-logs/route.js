export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const event_type = searchParams.get('event_type');
  const user_email = searchParams.get('user_email');
  const from       = searchParams.get('from');
  const to         = searchParams.get('to');
  const limit      = parseInt(searchParams.get('limit') || '200');

  let query = supabase
    .from('user_access_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (event_type) query = query.eq('event_type', event_type);
  if (user_email) query = query.eq('user_email', user_email);
  if (from)       query = query.gte('created_at', from);
  if (to)         query = query.lte('created_at', to + 'T23:59:59Z');

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}
