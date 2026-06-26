import { createServiceClient } from './supabase';

function db() {
  return createServiceClient();
}

// ── Subgrupos válidos para inventário ─────────────────────────────────────────
// Qualquer subgrupo é válido desde que o técnico tenha pelo menos este número de peças nele.
const SUBGRUPO_MIN_PECAS = 2;

function _normSubgrupo(s) {
  return (s || '').trim().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, ''); // remove acentos
}

// Produto final: código começa com "8" após remover zeros à esquerda (ex: 000000000008000481)
function _isProdutoFinal(itemCode) {
  const stripped = String(itemCode || '').replace(/^0+/, '');
  return stripped.startsWith('8');
}

// ── Usuários ──────────────────────────────────────────────────────────────────
export async function getUserByEmail(email) {
  const { data } = await db().from('users').select('id, name, email, role, active, password_hash, linked_to').eq('email', email).single();
  return data;
}

export async function getAllUsers() {
  const { data } = await db().from('users').select('id, name, email, role, active, linked_to, created_at').order('name');
  return data || [];
}

export async function createUser({ name, email, password_hash, role, linked_to }) {
  const insert = { name, email, password_hash, role };
  if (linked_to !== undefined) insert.linked_to = linked_to || null;
  const { data, error } = await db().from('users').insert(insert).select().single();
  if (error) throw error;
  return data;
}

export async function updateUser(id, fields) {
  const { data, error } = await db().from('users').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Escopo de acesso por papel ────────────────────────────────────────────────
// Retorna null (sem restrição) ou array de IDs de técnicos que o usuário pode ver.
// Hierarquia: admin=tudo | coordinator=seus técnicos | supervisor=seus técnicos | analyst=técnicos do supervisor vinculado
export async function getScopeFilter(session) {
  const { role, name: userName, linked_to: linkedTo } = session?.user || {};
  if (!role || role === 'admin' || role === 'analista_custo') return null;

  const supabase = createServiceClient();

  if (role === 'coordinator') {
    const { data } = await supabase.from('technicians').select('id').eq('coordinator_name', userName);
    return (data || []).map(t => t.id);
  }

  if (role === 'supervisor') {
    const { data } = await supabase.from('technicians').select('id').eq('supervisor_name', userName);
    return (data || []).map(t => t.id);
  }

  if (role === 'analyst' && linkedTo) {
    const { data: sup } = await supabase.from('users').select('name').eq('id', linkedTo).single();
    if (!sup?.name) return [];
    const { data } = await supabase.from('technicians').select('id').eq('supervisor_name', sup.name);
    return (data || []).map(t => t.id);
  }

  return [];
}

// ── Técnicos ──────────────────────────────────────────────────────────────────
export async function getAllTechnicians({ technicianIds } = {}) {
  if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) return [];
  let query = db().from('technicians').select('*').order('name');
  if (technicianIds !== null && technicianIds !== undefined) query = query.in('id', technicianIds);
  const { data } = await query;
  return data || [];
}

export async function createTechnician({ name, region, phone, email }) {
  const { data, error } = await db().from('technicians').insert({ name, region, phone, email }).select().single();
  if (error) throw error;
  return data;
}

// ── Inventários ───────────────────────────────────────────────────────────────
export async function getInventories({ from, to, technicianId, status, limit, technicianIds } = {}) {
  try {
    if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) return [];

    let query = db()
      .from('inventories')
      .select(`
        *,
        technician:technicians!left(name, region),
        inventory_schedules(scheduled_at, scheduled_subgroup, inventory_type)
      `)
      .order('created_at', { ascending: false });

    if (technicianId) query = query.eq('technician_id', technicianId);
    if (technicianIds !== null && technicianIds !== undefined) query = query.in('technician_id', technicianIds);
    if (status && status !== 'all') query = query.eq('status', status);
    else query = query.neq('status', 'cancelled');
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59');
    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;

    return (data || []).map(inv => ({
      ...inv,
      technicians: inv.technician || { name: 'Técnico não encontrado', region: '-' }
    }));
  } catch (e) {
    console.error("Erro em getInventories:", e);
    return [];
  }
}


export async function getInventoryKPIs({ from, to, technicianId, technicianIds } = {}) {
  try {
    if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) {
      return { completed: 0, in_progress: 0, total: 0 };
    }
    let query = db().from('inventories').select('status');
    query = query.neq('status', 'cancelled');
    if (technicianId) query = query.eq('technician_id', technicianId);
    if (technicianIds !== null && technicianIds !== undefined) query = query.in('technician_id', technicianIds);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to + 'T23:59:59');

    const { data, error } = await query;
    if (error) throw error;
    const rows = data || [];

    return {
      completed: rows.filter((r) => r.status === 'completed').length,
      in_progress: rows.filter((r) => r.status === 'in_progress').length,
      abandoned: rows.filter((r) => r.status === 'abandoned').length,
      recount_pending: rows.filter((r) => r.status === 'recount_pending').length,
      total: rows.length,
    };
  } catch (e) {
    console.error("Erro em getInventoryKPIs:", e);
    return { completed: 0, in_progress: 0, abandoned: 0, recount_pending: 0, total: 0 };
  }
}

export async function getAlerts({ from, to, technicianId, resolved, technicianIds } = {}) {
  try {
    if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) return [];

    let query = db()
      .from('alerts')
      .select(`*, technicians(id, name, region)`)
      .order('created_at', { ascending: false })
      .limit(200);

    if (from)                   query = query.gte('created_at', from);
    if (to)                     query = query.lte('created_at', to + 'T23:59:59');
    if (technicianId)           query = query.eq('technician_id', technicianId);
    if (technicianIds !== null && technicianIds !== undefined) query = query.in('technician_id', technicianIds);
    if (resolved !== undefined) query = query.eq('resolved', resolved);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Erro em getAlerts:', e);
    return [];
  }
}

export async function resolveAlert(id, resolvedBy) {
  const { data, error } = await db()
    .from('alerts')
    .update({ resolved: true, resolved_by: resolvedBy, resolved_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getInventoryById(id) {
  const { data, error } = await db().from('inventories').select(`*, technicians(name, region, phone), inventory_items(*)`).eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function updateInventory(id, fields) {
  const { data, error } = await db().from('inventories').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

// ── Lógica de Subgrupo e Peças ────────────────────────────────────────────────
export async function getWeekSubgroup(supabase) {
  try {
    const { data, error } = await supabase.from('v_current_week_subgroup').select('subgroup_name').maybeSingle();
    if (error) return null;
    return data?.subgroup_name || null;
  } catch (e) { return null; }
}

export async function getSubgroupForTechnician(supabase, technicianId, weekSubgroup) {
  const { data: allItems } = await supabase
    .from('technician_items')
    .select('item_subgroup, item_code')
    .eq('technician_id', technicianId)
    .eq('active', true)
    .not('item_subgroup', 'is', null);

  // Conta quantas peças existem por subgrupo, excluindo produtos finais
  const subgroupCount = new Map(); // key → { original, count }
  for (const item of (allItems || [])) {
    if (_isProdutoFinal(item.item_code)) continue;
    const original = (item.item_subgroup || '').trim();
    if (!original) continue;
    const key = _normSubgrupo(original);
    if (!subgroupCount.has(key)) subgroupCount.set(key, { original, count: 0 });
    subgroupCount.get(key).count += 1;
  }

  // Só considera subgrupos com pelo menos SUBGRUPO_MIN_PECAS peças e que não sejam "OUTROS"
  const subgroupMap = new Map();
  for (const [key, { original, count }] of subgroupCount) {
    if (key === 'outros') continue;
    if (count >= SUBGRUPO_MIN_PECAS) subgroupMap.set(key, original);
  }

  // Técnico sem subgrupos com quantidade suficiente
  if (subgroupMap.size === 0) return null;

  // Se a semana já tem um subgrupo padrão definido e o técnico tem peças nele — usa
  if (weekSubgroup) {
    const key = _normSubgrupo(weekSubgroup);
    if (subgroupMap.has(key)) return subgroupMap.get(key);
  }

  // Verifica quais subgrupos (dos 4 válidos) este técnico já usou no histórico
  const { data: history } = await supabase
    .from('inventory_schedules')
    .select('scheduled_subgroup, scheduled_at')
    .eq('technician_id', technicianId)
    .not('scheduled_subgroup', 'is', null)
    .order('scheduled_at', { ascending: false });

  const usedKeys = new Set(
    (history || []).map(h => _normSubgrupo(h.scheduled_subgroup)).filter(Boolean)
  );

  // Retorna o primeiro subgrupo válido que o técnico ainda não usou
  for (const [key, original] of subgroupMap) {
    if (!usedKeys.has(key)) return original;
  }

  // All subgroups used → restart cycle: pick the one used longest ago
  const lastUsedMap = {};
  for (const row of (history || [])) {
    const key = (row.scheduled_subgroup || '').trim().toLowerCase();
    if (!lastUsedMap[key]) lastUsedMap[key] = row.scheduled_at;
  }

  let oldestKey = null;
  let oldestDate = null;
  for (const [key] of subgroupMap) {
    const date = lastUsedMap[key];
    if (!date) continue;
    if (!oldestDate || new Date(date) < new Date(oldestDate)) {
      oldestDate = date;
      oldestKey = key;
    }
  }

  if (oldestKey) return subgroupMap.get(oldestKey);
  // Todos os 4 subgrupos já foram usados e sem histórico claro → reinicia pelo primeiro
  return [...subgroupMap.values()][0];
}

export async function getConsolidatedTechnicianItems(supabase, technicianId, weekSubgroup) {
  const { data: allItems, error } = await supabase.from('technician_items').select('*').eq('technician_id', technicianId).eq('active', true);
  if (error || !allItems || allItems.length === 0) return [];

  // Remove produtos finais (código começa com "8" após zeros à esquerda)
  const itensFiltrados = allItems.filter(item => !_isProdutoFinal(item.item_code));

  let selectedItems;
  const normSub = weekSubgroup ? _normSubgrupo(weekSubgroup) : null;
  if (!normSub || normSub === 'geral') {
    // Inventário geral (null ou 'Geral'): todas as peças do técnico
    selectedItems = itensFiltrados;
  } else {
    // Inventário parcial: filtra pelo subgrupo agendado, sem fallback para "todos"
    // (se subgrupo especificado e não há itens, retorna vazio — o caller trata como erro)
    selectedItems = itensFiltrados.filter(item => {
      const s = _normSubgrupo(item.item_subgroup || item.subgroup || '');
      return s === normSub;
    });
  }
  const consolidatedMap = new Map();
  selectedItems.forEach(item => {
    const code = item.item_code;
    if (consolidatedMap.has(code)) {
      const existing = consolidatedMap.get(code);
      existing.item_quantity = (Number(existing.item_quantity) || 0) + (Number(item.item_quantity) || 1);
    } else {
      consolidatedMap.set(code, { ...item, item_quantity: Number(item.item_quantity) || 1 });
    }
  });
  return Array.from(consolidatedMap.values());
}


// Funções de Criação
export async function createInventory(supabase, { technician_id, schedule_id, status, items }) {
  const { data, error } = await supabase.from('inventories').insert({ technician_id, schedule_id, status }).select().single();
  if (error) throw error;
  if (items && items.length > 0) {
    const inventoryItems = items.map(item => ({
      inventory_id: data.id,
      item_name: item.item_name,
      item_code: item.item_code,
      system_qty: Number(item.item_quantity) || 0,
      item_subgroup: item.item_subgroup || item.subgroup
    }));
    await supabase.from('inventory_items').insert(inventoryItems);
  }
  return data;
}

export async function createFlowLog(supabase, { inventory_id, step, details }) {
  const { data, error } = await supabase.from('inventory_logs').insert({ inventory_id, step, details }).select().single();
  if (error) throw error;
  return data;
}

/**
 * NOVA FUNÇÃO: Cria um agendamento e o inventário correspondente de uma só vez.
 * Mantém o seu código original intacto e apenas adiciona esta funcionalidade.
 */
export async function createScheduleWithInventory(supabase, { technician_id, scheduled_at, week_ref, notes, scheduled_subgroup }) {
  // 1. Criar o Inventário primeiro (Status: pending)
  const { data: inventory, error: invError } = await supabase
    .from('inventories')
    .insert({
      technician_id,
      status: 'pending',
      week_ref,
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (invError) throw invError;

  // 2. Criar o Agendamento vinculado ao Inventário criado acima
  const { data: schedule, error: schError } = await supabase
    .from('inventory_schedules')
    .insert({
      technician_id,
      inventory_id: inventory.id,
      scheduled_at,
      week_ref,
      status: 'pending',
      notes,
      scheduled_subgroup
    })
    .select()
    .single();

  if (schError) throw schError;

  return { inventory, schedule };
}

export async function getCountHistory({ from, to, technicianId, inventoryId, technicianIds } = {}) {
  try {
    if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) return [];

    let query = db()
      .from('inventory_count_history')
      .select(`
        id, inventory_id, item_code, item_name,
        physical_qty, system_qty, count_number, counted_at,
        technicians(id, name, region)
      `)
      .order('counted_at', { ascending: false })
      .limit(500);

    if (from)          query = query.gte('counted_at', from);
    if (to)            query = query.lte('counted_at', to + 'T23:59:59');
    if (technicianId)  query = query.eq('technician_id', technicianId);
    if (technicianIds !== null && technicianIds !== undefined) query = query.in('technician_id', technicianIds);
    if (inventoryId)   query = query.eq('inventory_id', inventoryId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('Erro em getCountHistory:', e);
    return [];
  }
}

export async function updateDivergenceStatus(id, { status, ticket_number, ticket_note } = {}) {
  const fields = {};
  if (status !== undefined) fields.status = status;
  if (ticket_number !== undefined) fields.ticket_number = ticket_number;
  if (ticket_note !== undefined) fields.ticket_note = ticket_note;
  const { data, error } = await db().from('divergences').update(fields).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function getDivergences({ from, to, technicianId, status, technicianIds, inventoryId } = {}) {
  if (technicianIds !== null && technicianIds !== undefined && technicianIds.length === 0) return [];

  const { createServiceClient } = await import('@/lib/supabase');
  const supabase = createServiceClient();

  let query = supabase
    .from('divergences')
    .select(`
      id, inventory_id, technician_id, item_code, item_name,
      system_qty, physical_qty, difference, percentage_diff,
      status, is_recount, created_at, ticket_number, ticket_note,
      technicians ( id, name, region ),
      inventories ( id, week_ref, is_recount, status )
    `)
    .order('created_at', { ascending: false });

  if (from)          query = query.gte('created_at', from);
  if (to)            query = query.lte('created_at', to + 'T23:59:59');
  if (technicianId)  query = query.eq('technician_id', technicianId);
  if (technicianIds !== null && technicianIds !== undefined) query = query.in('technician_id', technicianIds);
  if (inventoryId)   query = query.eq('inventory_id', inventoryId);
  if (status)        query = query.eq('status', status);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
