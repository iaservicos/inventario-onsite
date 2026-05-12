import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTechnicianItems } from '@/lib/databricks'; // Importando do arquivo databricks!

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId');
  
  if (!technicianId) return NextResponse.json({ error: 'TechnicianId obrigatório' }, { status: 400 });

  try {
    // Esta função no lib/databricks.js já faz a query SQL direto no Warehouse
    const data = await getTechnicianItems(technicianId);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Erro ao buscar no Databricks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
