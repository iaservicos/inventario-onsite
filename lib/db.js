import { createServiceClient } from './supabase';

function db() {
  return createServiceClient();
}

// ── Usuários ──────────────────────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const { data } = await db()
    .from('users')
    .select('*')
    .eq('email', email)
    .single();
  return data;
}

export async function getAllUsers() {
  const { data } = await db()
    .from('users')
    .select('id, name, email, role, active, created_at')
    .order('name');
  return data || [];
}

export async function createUser({ name, email, password_hash, role }) {
  const { data, error } = await db()
    .from('users')
    .insert({ name, email, password_hash, role })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateUser(id, fields) {
  const { data, error } = await db()
    .from('users')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Técnicos ──────────────────────────────────────────────────────────────────
export async function getAllTechnicians() {
  const { data } = await db()
    .from('technicians')
    .select('*')
    .order('name');
  return data || [];
}

export async function createTechnician({ name, region, phone, email }) {
  const { data, error } = await db()
    .from('technicians')
    .insert({ name, region, phone, email })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Inventários ───────────────────────────────────────────────────────────────
export async function getInventories({ from, to, technicianId, status } = {}) {
  let query = db()
    .from('inventories')
    .select(`*, technicians(name, region)`)
    .order('created_at', { ascending: false });

  if (technicianId) query = query.eq('technician_id', technicianId);
  if (status && status !== 'all') query = query.eq('status', status);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to + 'T23:59:59');

  const { data } = await query;
  return data || [];
}

export async function getInventoryKPIs({ from, to, technicianId } = {}) {
  let query = db().from('inventories').select('status');

  if (technicianId) query = query.eq('technician_id', technicianId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to + 'T23:59:59');

  const { data } = await query;
  const rows = data || [];

  return {
    completed: rows.filter((r) => r.status === 'completed').length,
    in_progress: rows.filter((r) => r.status === 'in_progress').length,
    total: rows.length,
  };
}

export async function getInventoryById(id) {
  const { data, error } = await db()
    .from('inventories')
    .select(`
      *,
      technicians(name, region, phone),
      inventory_items(*)
    `)
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateInventory(id, fields) {
  const { data, error } = await db()
    .from('inventories')
    .update(fields)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Lógica de Subgrupo e Peças (ADICIONADO PARA O NOVO FLUXO) ──────────────────

/**
 * Busca o subgrupo prioritário da semana atual através da view
 */
export async function getWeekSubgroup(supabase) {
  try {
    const { data, error } = await supabase
      .from('v_current_week_subgroup')
      .select('subgroup_name')
      .maybeSingle();
    
    if (error) {
      console.error("Erro ao buscar subgrupo da semana:", error);
      return null;
    }
    return data?.subgroup_name || null;
  } catch (e) {
    return null;
  }
}

/**
 * Busca as peças do técnico e filtra pelo subgrupo da semana.
 * Se não houver peças no subgrupo, retorna todas as peças ativas.
 */
export async function getConsolidatedTechnicianItems(supabase, technicianId, weekSubgroup) {
  // 1. Busca TODAS as peças ativas do técnico
  const { data: allItems, error } = await supabase
    .from('technician_items')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('active', true);

  if (error || !allItems || allItems.length === 0) return [];

  // 2. Tenta filtrar pelo subgrupo da semana
  let selectedItems = [];
  if (weekSubgroup) {
    const target = weekSubgroup.trim().toLowerCase();
    selectedItems = allItems.filter(item => {
      // Tenta encontrar o subgrupo em 'item_subgroup' ou 'subgroup'
      const s = (item.item_subgroup || item.subgroup || '').trim().toLowerCase();
      return s === target;
    });
  }

  // 3. Se o filtro do subgrupo não retornar nada, pega todas as peças
  if (selectedItems.length === 0) {
    selectedItems = allItems;
  }

  // 4. Consolidação por Código (Soma quantidades de códigos iguais)
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
