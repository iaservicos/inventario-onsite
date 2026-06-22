import { createServiceClient } from '@/lib/supabase';

export async function GET(request) {
  try {
    const supabase = createServiceClient();

    // Buscar todos os técnicos com suas peças usadas
    const { data: technicians, error: techError } = await supabase
      .from('technicians')
      .select('id, name, region, supervisor_name')
      .eq('active', true)
      .order('name');

    if (techError) throw techError;
    if (!technicians || technicians.length === 0) {
      return Response.json({
        technicians: [],
        success: true
      });
    }

    // Buscar peças usadas para todos os técnicos
    const { data: items, error: itemError } = await supabase
      .from('technician_used_items')
      .select('*')
      .order('technician_id, item_code');

    if (itemError) throw itemError;

    // Agrupar peças por técnico
    const itemsByTech = {};
    technicians.forEach(tech => {
      itemsByTech[tech.id] = [];
    });

    if (items && items.length > 0) {
      items.forEach(item => {
        if (itemsByTech[item.technician_id]) {
          itemsByTech[item.technician_id].push(item);
        }
      });
    }

    // Montar resposta
    const result = technicians.map(tech => ({
      id: tech.id,
      name: tech.name,
      region: tech.region,
      supervisor_name: tech.supervisor_name,
      items: itemsByTech[tech.id] || []
    })).filter(t => t.items.length > 0);

    return Response.json({
      technicians: result,
      success: true
    });
  } catch (error) {
    console.error('[Export All Used Items] Erro:', error);
    return Response.json(
      { error: 'Erro ao exportar peças usadas: ' + error.message },
      { status: 500 }
    );
  }
}
