import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getTechnicianItems } from '@/lib/databricks'; 
import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const technicianId = searchParams.get('technicianId'); 
  
  if (!technicianId) return NextResponse.json({ error: 'TechnicianId obrigatório' }, { status: 400 });

  try {
    const supabase = createServiceClient();
    
    // 1. Buscar o técnico no banco local para pegar o databricks_name
    const { data: technician, error: techError } = await supabase
      .from('technicians')
      .select('name, databricks_name')
      .eq('id', technicianId)
      .single();

    if (techError || !technician) {
      return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });
    }

    const searchName = technician.databricks_name || technician.name;

    // 2. Buscar itens no Databricks usando a função original restaurada
    const data = await getTechnicianItems(searchName);
    
    // 3. Mapear os dados para o formato esperado pela UI
    const mappedData = data.map((item, index) => ({
      id: `db-${index}-${item.item_code}`, 
      item_code: item.item_code,
      item_name: item.item_name,
      item_quantity: item.item_quantity, // Campo original restaurado
      unit: 'un', // Valor padrão já que não vem mais na query original
      active: true, 
      from_databricks: true
    }));

    return NextResponse.json(mappedData);
  } catch (error) {
    console.error('Erro ao buscar itens do Databricks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
