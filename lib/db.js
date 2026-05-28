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
export async function getInventories({ from, to, technicianId, status, limit } = {}) {
  try {
    let query = db()
      .from('inventories')
      .select(`*, technicians(name, region)`)
      .order('created_at', { ascending: false });

    if (technicianId) query = query.eq('technician_id', technicianId);
    if (status && status !== 'all') query = query.eq('status', status);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59');
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Erro em getInventories:", e);
    return [];
  }
}

export async function getInventoryKPIs({ from, to, technicianId } = {}) {
  try {
    let query = db().from('inventories').select('status');

    if (technicianId) query = query.eq('technician_id', technicianId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw error;
    
    const rows = data || [];

    return {
      completed: rows.filter((r) => r.status === 'completed').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      total: rows.length,
    };
  } catch (e) {
    console.error("Erro em getInventoryKPIs:", e);
    return { completed: 0, in_progress: 0, total: 0 };
  }
}

export async function getAlerts({ resolved } = {}) {
  try {
    const { data, error } = await db()
      .from('inventory_logs')
      .select(`*, inventories(*, technicians(name))`)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error("Erro em getAlerts:", e);
    return [];
  }
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

// ── Lógica de Subgrupo e Peças ────────────────────────────────────────────────

export async function getWeekSubgroup(supabase) {
  try {
    const { data, error } = await supabase
      .from('v_current_week_subgroup')
      .select('subgroup_name')
      .maybeSingle();
    
    if (error) return null;
    return data?.subgroup_name || null;
  } catch (e) {
    return null;
  }
}

export async function getConsolidatedTechnicianItems(supabase, technicianId, weekSubgroup) {
  const { data: allItems, error } = await supabase
    .from('technician_items')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('active', true);

  if (error || !allItems || allItems.length === 0) return [];

  let selectedItems = [];
  if (weekSubgroup) {
    const target = weekSubgroup.trim().toLowerCase();
    selectedItems = allItems.filter(item => {
      const s = (item.item_subgroup || item.subgroup || '').trim().toLowerCase();
      return s === target;
    });
  }

  if (selectedItems.length === 0) selectedItems = allItems;

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

// --- FUNÇÕES QUE ESTAVAM FALTANDO PARA O DISPATCH FUNCIONAR ---

export async function createInventory(supabase, { technician_id, schedule_id, status, items }) {
  const { data, error } = await supabase
    .from('inventories')
    .insert({ technician_id, schedule_id, status })
    .select()
    .single();

  if (error) throw error;

  if (items && items.length > 0) {
    const inventoryItems = items.map(item => ({
      inventory_id: data.id,
      item_name: item.item_name,
      item_code: item.item_code,
      item_quantity: item.item_quantity,
      item_subgroup: item.item_subgroup || item.subgroup
    }));

    await supabase.from('inventory_items').insert(inventoryItems);
  }

  return data;
}

export async function createFlowLog(supabase, { inventory_id, step, details }) {
  const { data, error } = await supabase
    .from('inventory_logs')
    .insert({ inventory_id, step, details })
    .select()
    .single();

  if (error) throw error;
  return data;
}