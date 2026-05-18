import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createServiceClient();
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role')
      .eq('role', 'supervisor')
      .eq('active', true)
      .order('name');

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json([], { status: 200 });
  }
}
