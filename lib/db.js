// 1. Busca o subgrupo da semana de forma segura
export async function getWeekSubgroup(supabase) {
  try {
    const { data, error } = await supabase
      .from('v_current_week_subgroup')
      .select('subgroup_name')
      .maybeSingle();
    
    if (error) {
      console.error("Erro na view de subgrupo:", error);
      return null;
    }
    return data?.subgroup_name || null;
  } catch (e) {
    return null;
  }
}

// 2. Busca e filtra as peças (Corrigido)
export async function getConsolidatedTechnicianItems(supabase, technicianId, weekSubgroup) {
  // Busca TODAS as peças ativas do técnico
  const { data: allItems, error } = await supabase
    .from('technician_items')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('active', true);

  if (error || !allItems || allItems.length === 0) return [];

  let selectedItems = [];
  
  if (weekSubgroup) {
    const target = weekSubgroup.trim().toLowerCase();
    // Tenta filtrar pelo campo correto (item_subgroup ou subgroup)
    selectedItems = allItems.filter(item => {
      const s = (item.item_subgroup || item.subgroup || '').trim().toLowerCase();
      return s === target;
    });
  }

  // Se o filtro do subgrupo não achou nada, pegamos apenas as 10 primeiras 
  // para evitar carregar centenas de peças e travar a API
  if (selectedItems.length === 0) {
    selectedItems = allItems.slice(0, 15); 
  }

  // Consolidação por Código
  const consolidatedMap = new Map();
  selectedItems.forEach(item => {
    const code = item.item_code;
    if (consolidatedMap.has(code)) {
      const existing = consolidatedMap.get(code);
      existing.item_quantity = (Number(existing.item_quantity) || 0) + (Number(item.item_quantity) || 1);
    } else {
      consolidatedMap.set(code, { 
        ...item, 
        item_quantity: Number(item.item_quantity) || 1 
      });
    }
  });
  
  return Array.from(consolidatedMap.values());
}
