import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function getIP(req) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    null
  );
}

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ ok: false }, { status: 401 });

    const body = await req.json();
    const { event_type, page_path, action_detail } = body;

    const ip      = getIP(req);
    const city    = req.headers.get('x-vercel-ip-city')    || null;
    const region  = req.headers.get('x-vercel-ip-region')  || null;
    const country = req.headers.get('x-vercel-ip-country') || null;
    const ua      = req.headers.get('user-agent')          || null;

    await supabase.from('user_access_logs').insert({
      user_email:    session.user.email,
      user_name:     session.user.name,
      user_role:     session.user.role,
      event_type,
      page_path:     page_path || null,
      action_detail: action_detail || null,
      ip_address:    ip,
      city:          city ? decodeURIComponent(city) : null,
      region:        region || null,
      country:       country || null,
      user_agent:    ua,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
