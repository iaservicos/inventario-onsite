import { createServiceClient } from './supabase';

function db() {
  return createServiceClient();
}

// ── Peças por Técnico ─────────────────────────────────────────────────────────

export async function getTechnicianItems(technicianId, onlyActive = true) {
  let query = db()
    .from('technician_items')
    .select('*')
    .eq('technician_id', technicianId)
    .order('item_code', { ascending: true });
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function upsertTechnicianItems(technicianId, items) {
  const rows = items.map((item) => ({
    technician_id: technicianId,
    item_code: item.item_code,
    item_name: item.item_name,
    unit: item.unit || 'un',
    active: true,
    updated_at: new Date().toISOString(),
  }));
  const { data, error } = await db()
    .from('technician_items')
    .upsert(rows, { onConflict: 'technician_id,item_code' })
    .select();
  if (error) throw error;
  return data;
}

export async function deleteTechnicianItem(id) {
  const { error } = await db()
    .from('technician_items')
    .update({ active: false })
    .eq('id', id);
  if (error) throw error;
}

// ── Agendamentos ──────────────────────────────────────────────────────────────

export async function getSchedules({ technicianId, status, from, to } = {}) {
  let query = db()
    .from('inventory_schedules')
    .select(`*, technicians(name, phone, region), users(name)`)
    .order('scheduled_at', { ascending: true });
  if (technicianId) query = query.eq('technician_id', technicianId);
  if (status) query = query.eq('status', status);
  if (from) query = query.gte('scheduled_at', from);
  if (to) query = query.lte('scheduled_at', to + 'T23:59:59');
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createSchedule({ technician_id, scheduled_by, scheduled_at, week_ref, items_count, notes, scheduled_subgroup, scheduled_items }) {
  const { data, error } = await db()
    .from(\'inventory_schedules\')
    .insert({ 
      technician_id, 
      scheduled_by, 
      scheduled_at, 
      week_ref, 
      items_count: items_count || 10, // Será sobrescrito pela lógica em schedules/route.js
      notes, 
      scheduled_subgroup, 
      scheduled_items 
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateSchedule(id, fields) {
  const { data, error } = await db()
    .from('inventory_schedules')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getPendingSchedulesDue() {
  const now = new Date().toISOString();
  const { data, error } = await db()
    .from('inventory_schedules')
    .select(`*, technicians(id, name, phone, region)`)
    .eq('status', 'pending')
    .lte('scheduled_at', now);
  if (error) throw error;
  return data || [];
}

// ── Sessões GPT Maker ─────────────────────────────────────────────────────────

export async function createGptSession({ inventory_id, technician_id, phone, session_token }) {
  const { data, error } = await db()
    .from('gptmaker_sessions')
    .insert({
      inventory_id,
      technician_id,
      phone,
      session_token,
      status: 'active',
      current_item_index: 0,
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getGptSessionByToken(token) {
  const { data, error } = await db()
    .from('gptmaker_sessions')
    .select(`*, technicians(name, phone), inventories(week_ref, total_items)`)
    .eq('session_token', token)
    .single();
  if (error) return null;
  return data;
}

export async function getActiveSessionByPhone(phone) {
  const { data } = await db()
    .from('gptmaker_sessions')
    .select(`*, technicians(name), inventories(week_ref)`)
    .eq('phone', phone)
    .in('status', ['active', 'waiting_answer', 'recount'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function updateGptSession(id, fields) {
  const { data, error } = await db()
    .from('gptmaker_sessions')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getAbandonedSessions(thresholdMinutes = 240) {
  const cutoff = new Date(Date.now() - thresholdMinutes * 60 * 1000).toISOString();
  const { data } = await db()
    .from('gptmaker_sessions')
    .select(`*, technicians(name, phone), inventories(week_ref)`)
    .in('status', ['active', 'waiting_answer'])
    .lt('last_message_at', cutoff)
    .eq('abandon_notified', false);
  return data || [];
}
