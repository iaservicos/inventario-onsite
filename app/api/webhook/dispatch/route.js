import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { updateSchedule, createGptSession, getTechnicianItems } from '@/lib/db-gptmaker';
import { createInventory, updateInventory, createFlowLog } from '@/lib/db';
import crypto from 'crypto';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';

// Retorna o subgrupo prioritário da semana atual (ciclo de 5 semanas)
async function getWeekSubgroup(supabase) {
  const { data } = await supabase
    .from('v_current_week_subgroup')
    .select('subgroup_name')
    .maybeSingle();
  return data?.subgroup_name || null;
}

// Monta a mensagem inicial para o GPT Maker com a lista de peças
function buildFirstMessage(techName, items, weekSubgroup) {
  const subgroupLabel = weekSubgroup ? ` (foco: ${weekSubgroup})` : '';
  const itemLines = items
    .map((item, i) => `${i + 1}. ${item.item_name} — Sistema: ${item.item_quantity} un.`)
    .join('\n');

  return (
    `Olá, ${techName}! Chegou a hora do seu inventário semanal${subgroupLabel}.\n\n` +
    `Preciso que você conte as seguintes peças e me informe a quantidade física de cada uma:\n\n` +
    `${itemLines}\n\n` +
    `Vamos começar? Me informe a quantidade da peça 1.`
  );
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const scheduleId = body.schedule_id || null;

    const supabase = createServiceClient();
    let schedules = [];

    if (scheduleId) {
      const { data } = await supabase.from('inventory_schedules').select('*, technicians(*)').eq('id', scheduleId).eq('status', 'pending').single();
      if (data) schedules = [data];
    } else {
      const { data } = await supabase.from('inventory_schedules').select('*, technicians(*)').eq('status', 'pending');
      schedules = data || [];
    }

    if (schedules.length === 0) return NextResponse.json({ ok: true, dispatched: 0 });

    // Busca o subgrupo prioritário da semana atual
    const weekSubgroup = await getWeekSubgroup(supabase);

    const results = [];
    for (const schedule of schedules) {
      try {
        const tech = schedule.technicians;

        // Busca TODAS as peças ativas do técnico
        const { data: allItems } = await supabase
          .from('technician_items')
          .select('*')
          .eq('technician_id', schedule.technician_id)
          .eq('active', true);

        if (!allItems?.length) {
          results.push({ schedule_id: schedule.id, ok: false, reason: 'sem_pecas' });
          continue;
        }

        // --- LÓGICA DE SELEÇÃO COM PRIORIDADE DE SUBGRUPO SEMANAL ---
        const limit = schedule.items_count || 10;
        let selectedItems = [];

        // 1. Primeiro: tenta preencher com peças do subgrupo da semana (aleatório dentro do grupo)
        if (weekSubgroup) {
          const weekItems = allItems
            .filter(item => (item.item_subgroup || '').toLowerCase() === weekSubgroup.toLowerCase())
            .sort(() => Math.random() - 0.5);
          selectedItems = weekItems.slice(0, limit);
        }

        // 2. Se não atingiu o limite, completa com outros subgrupos (rotação aleatória entre grupos)
        if (selectedItems.length < limit) {
          const usedIds = new Set(selectedItems.map(i => i.id));
          const remaining = allItems.filter(i => !usedIds.has(i.id));

          // Agrupa os restantes por subgrupo
          const groups = {};
          remaining.forEach(item => {
            const sub = item.item_subgroup || 'Outros';
            if (!groups[sub]) groups[sub] = [];
            groups[sub].push(item);
          });

          const groupNames = Object.keys(groups).sort(() => Math.random() - 0.5);
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
        }

        // Fallback: se ainda vazio, sorteia aleatoriamente
        if (selectedItems.length === 0) {
          selectedItems = allItems.sort(() => Math.random() - 0.5).slice(0, limit);
        }

        // Cria o inventário no banco
        const inventory = await createInventory({
          technician_id: schedule.technician_id,
          week_ref: schedule.week_ref,
          total_items: selectedItems.length,
        });

        const itemRows = selectedItems.map(item => ({
          inventory_id: inventory.id,
          item_code: item.item_code,
          item_name: item.item_name,
          item_subgroup: item.item_subgroup,
          system_qty: item.item_quantity,
          status: 'pending',
        }));

        await supabase.from('inventory_items').insert(itemRows);
        await updateInventory(inventory.id, { status: 'in_progress', started_at: new Date().toISOString() });

        // Monta a mensagem inicial com a lista de peças para o GPT Maker
        const firstMessage = buildFirstMessage(tech.name, selectedItems, weekSubgroup);

        const sessionToken = crypto.randomBytes(32).toString('hex');
        await createGptSession({ inventory_id: inventory.id, technician_id: schedule.technician_id, phone: tech.phone, session_token: sessionToken });
        await updateSchedule(schedule.id, { status: 'dispatched', inventory_id: inventory.id });

        results.push({ schedule_id: schedule.id, ok: true, session_token: sessionToken, first_message: firstMessage, phone: tech.phone });
      } catch (err) {
        results.push({ schedule_id: schedule.id, ok: false, reason: err.message });
      }
    }

    return NextResponse.json({ ok: true, results });
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}