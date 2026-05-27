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
    abandoned: rows.filter((r) => r.status === 'abandoned').length,
    recount_pending: rows.filter((r) => r.status === 'recount_pending').length,
    total: rows.length,
  };
}

export async function createInventory({ technician_id, week_ref, total_items }) {
  const { data, error } = await db()
    .from('inventories')
    .insert({
      technician_id,
      week_ref,
      total_items: total_items || 0,
      status: 'pending',
    })
    .select()
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

// ── Alertas ───────────────────────────────────────────────────────────────────

export async function getAlerts({ from, to, technicianId, status, resolved } = {}) {
  let query = db()
    .from('alerts')
    .select(`*, technicians(name)`)
    .order('created_at', { ascending: false });

  if (technicianId) query = query.eq('technician_id', technicianId);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to + 'T23:59:59');
  if (resolved !== undefined) query = query.eq('resolved', resolved);

  const { data } = await query;
  return data || [];
}

export async function resolveAlert(id, resolvedBy) {
  const { data, error } = await db()
    .from('alerts')
    .update({ resolved: true, resolved_at: new Date().toISOString(), resolved_by: resolvedBy })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createAlert({ type, severity, technician_id, inventory_id, title, description }) {
  const { data, error } = await db()
    .from('alerts')
    .insert({ type, severity, technician_id, inventory_id, title, description })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Divergências ──────────────────────────────────────────────────────────────

export async function getDivergences({ from, to, technicianId, status } = {}) {
  let query = db()
    .from('divergences')
    .select(`*, technicians(name, region), inventories(week_ref)`)
    .order('created_at', { ascending: false });

  if (technicianId) query = query.eq('technician_id', technicianId);
  if (status && status !== 'all') query = query.eq('status', status);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to + 'T23:59:59');

  const { data } = await query;
  return data || [];
}

export async function updateDivergenceStatus(id, status) {
  const { data, error } = await db()
    .from('divergences')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ── Logs de Fluxo ─────────────────────────────────────────────────────────────

export async function getFlowLogs({ from, to, technicianId, source, level } = {}) {
  let query = db()
    .from('flow_logs')
    .select(`*, technicians(name)`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (technicianId) query = query.eq('technician_id', technicianId);
  if (source && source !== 'all') query = query.eq('source', source);
  if (level && level !== 'all') query = query.eq('level', level);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to + 'T23:59:59');

  const { data } = await query;
  return data || [];
}

export async function createFlowLog({ source, level, action, technician_id, inventory_id, message, details }) {
  const { error } = await db()
    .from('flow_logs')
    .insert({ source, level, action, technician_id, inventory_id, message, details });
  if (error) console.error('[FlowLog]', error);
}

// ── Saúde das Integrações ─────────────────────────────────────────────────────

export async function getIntegrationHealth() {
  const { data } = await db()
    .from('integration_health')
    .select('*')
    .order('last_check', { ascending: false });
  return data || [];
}

export async function upsertIntegrationHealth({ integration, status, response_time_ms, success_rate, error_count, last_error }) {
  const { error } = await db()
    .from('integration_health')
    .upsert({ integration, status, response_time_ms, success_rate, error_count, last_error, last_check: new Date().toISOString() }, { onConflict: 'integration' });
  if (error) throw error;
}

// ── Lógica de Subgrupo e Peças ────────────────────────────────────────────────

export async function getWeekSubgroup(supabase) {
  const { data } = await supabase
    .from('v_current_week_subgroup')
    .select('subgroup_name')
    .maybeSingle();
  return data?.subgroup_name || null;
}

export async function getConsolidatedTechnicianItems(supabase, technicianId, weekSubgroup) {
  // 1. Busca TODAS as peças ativas do técnico
  const { data: allItems, error } = await supabase
    .from('technician_items')
    .select('*')
    .eq('technician_id', technicianId)
    .eq('active', true);

  if (error) throw error;
  if (!allItems || allItems.length === 0) return [];

  // 2. Filtragem por Subgrupo da Semana
  let selectedItems = [];
  
  if (weekSubgroup) {
    // Normaliza para comparação (remove espaços e ignora maiúsculas)
    const targetSubgroup = weekSubgroup.trim().toLowerCase();
    
    selectedItems = allItems.filter(item => {
      const itemSubgroup = (item.item_subgroup || '').trim().toLowerCase();
      return itemSubgroup === targetSubgroup;
    });
  }

  // 3. Se o filtro do subgrupo não retornar nada, aí sim pegamos tudo (fallback)
  // Mas agora a comparação acima é muito mais rigorosa
  if (selectedItems.length === 0) {
    selectedItems = allItems;
  }

  // 4. Consolidação por Código (Soma quantidades de códigos iguais)
  const consolidatedMap = new Map();
  
  selectedItems.forEach(item => {
    const code = item.item_code;
    if (consolidatedMap.has(code)) {
      const existing = consolidatedMap.get(code);
      // Soma a quantidade (garante que seja número)
      existing.item_quantity = (Number(existing.item_quantity) || 0) + (Number(item.item_quantity) || 1);
    } else {
      // Cria uma cópia para não alterar o objeto original
      consolidatedMap.set(code, { 
        ...item, 
        item_quantity: Number(item.item_quantity) || 1 
      });
    }
  });
  
  return Array.from(consolidatedMap.values());
}
