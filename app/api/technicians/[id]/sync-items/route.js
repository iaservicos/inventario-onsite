import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createClient } from '@supabase/supabase-js';
import { getTechnicianItems, getTechnicianItemsSample, verifyTechnicianInDatabricks } from '@/lib/databricks';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const technicianId = parseInt(params.id);
  const body = await request.json().catch(() => ({}));
  const mode = body.mode || 'sample';
  const count = parseInt(body.count) || 10;

  const { data: technician, error: techError } = await supabase
    .from('technicians')
    .select('id, name, databricks_name, active')
    .eq('id', technicianId)
    .single();

  if (techError || !technician) {
    return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
  }

  const searchName = technician.databricks_name || technician.name;

  try {
    const verification = await verifyTechnicianInDatabricks(searchName);
    if (!verification.found) {
      return NextResponse.json({ error: 'Não encontrado no Databricks' }, { status: 404 });
    }

    const items = mode === 'full' 
      ? await getTechnicianItems(searchName)
      : await getTechnicianItemsSample(searchName, count);

    return NextResponse.json({
      ok: true,
      found_in_databricks: true,
      items
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const technicianId = parseInt(params.id);

  const { data: technician, error } = await supabase
    .from('technicians')
    .select('id, name, databricks_name')
    .eq('id', technicianId)
    .single();

  if (error || !technician) {
    return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
  }

  const searchName = technician.databricks_name || technician.name;

  try {
    const verification = await verifyTechnicianInDatabricks(searchName);
    return NextResponse.json({
      technician_id: technicianId,
      technician_name: technician.name,
      found_in_databricks: verification.found,
      databricks_name: verification.databricks_name
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
