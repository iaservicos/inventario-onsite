import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTechnicianItems } from '@/lib/databricks'; // PRECISA SER ESTA LINHA!

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId'); // Aqui virá o NOME do técnico
  
  if (!technicianId) return NextResponse.json({ error: 'TechnicianId obrigatório' }, { status: 400 });

  try {
    const data = await getTechnicianItems(technicianId);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
