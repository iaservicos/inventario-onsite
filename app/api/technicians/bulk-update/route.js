import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { ids, updates } = body;

    const supabase = createServiceClient();
    const updateData = {};
    if (updates.coordinator_name !== undefined) updateData.coordinator_name = updates.coordinator_name || null;
    if (updates.supervisor_name !== undefined) updateData.supervisor_name = updates.supervisor_name || null;
    if (updates.active !== undefined) updateData.active = updates.active;
    if (updates.region !== undefined) updateData.region = updates.region || null;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase.from('technicians').update(updateData).in('id', ids).select();
    if (error) throw error;
    return NextResponse.json({ success: true, updated: data?.length || 0 }, { status: 200 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
