import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateSchedule, createGptSession, getTechnicianItems } from '@/lib/db-gptmaker';
import { createInventory, updateInventory, createFlowLog } from '@/lib/db';
import crypto from 'crypto';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const scheduleId = body.schedule_id || null;

    const supabase = createServiceClient();
    let schedules = [];
    
    if (scheduleId) {
      const { data } = await supabase.from('inventory_schedules').select(`*, technicians(*)`).eq('id', scheduleId).eq('status', 'pending').single();
      if (data) schedules = [data];
    }

    if (schedules.length === 0) return NextResponse.json({ ok: true, dispatched: 0 });

    const results = [];
    for (const schedule of schedules) {
      try {
        const tech = schedule.technicians;
        // Busca TODAS as peças já classificadas no banco
        const { data: allItems } = await supabase.from('technician_items').select('*').eq('technician_id', schedule.technician_id).eq('active', true);
        
        if (!allItems?.length) {
          results.push({ schedule_id: schedule.id, ok: false, reason: 'sem_pecas' });
          continue;
        }

        // --- LÓGICA DE SELEÇÃO INTELIGENTE POR SUBGRUPO ---
        const groups = {};
        allItems.forEach(item => {
          const sub = item.item_subgroup || 'Outros';
          if (!groups[sub]) groups[sub] = [];
          groups[sub].push(item);
        });

        let selectedItems = [];
        const groupNames = Object.keys(groups).sort(() => Math.random() - 0.5);
        const limit = schedule.items_count || 10;
        let attempt = 0;

        while (selectedItems.length < limit && groupNames.length > 0 && attempt < 100) {
          const groupName = groupNames[attempt % groupNames.length];
          if (groups[groupName].length > 0) {
            const idx = Math.floor(Math.random() * groups[groupName].length);
            selectedItems.push(groups[groupName].splice(idx, 1)[0]);
          } else {
            groupNames.splice(attempt % groupNames.length, 1);
            continue;
          }
          attempt++;
        }

        // Fallback caso a lógica de grupos falhe
        if (selectedItems.length === 0) selectedItems = allItems.sort(() => Math.random() - 0.5).slice(0, limit);

        const inventory = await createInventory({
          technician_id: schedule.technician_id,
          week_ref: schedule.week_ref,
          total_items: selectedItems.length,
        });

        const itemRows = selectedItems.map((item) => ({
          inventory_id: inventory.id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_subgroup: item.item_subgroup, // Salva o subgrupo no inventário
          system_qty: 0,
          status: 'pending',
        }));

        await supabase.from('inventory_items').insert(itemRows);
        await updateInventory(inventory.id, { status: 'in_progress', started_at: new Date().toISOString() });

        const sessionToken = crypto.randomBytes(32).toString('hex');
        await createGptSession({ inventory_id: inventory.id, technician_id: schedule.technician_id, phone: tech.phone, session_token: sessionToken });
        await updateSchedule(schedule.id, { status: 'dispatched', inventory_id: inventory.id });

        results.push({ schedule_id: schedule.id, ok: true, session_token: sessionToken });
      } catch (err) {
        results.push({ schedule_id: schedule.id, ok: false, reason: err.message });
      }
    }
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}