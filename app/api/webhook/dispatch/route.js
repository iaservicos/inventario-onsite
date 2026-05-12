import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  getPendingSchedulesDue,
  updateSchedule,
  createGptSession,
  getTechnicianItems,
} from '@/lib/db-gptmaker';
import { createInventory, updateInventory, createFlowLog } from '@/lib/db';
import crypto from 'crypto';

const DISPATCH_SECRET = process.env.DISPATCH_SECRET || '';

export async function POST(request) {
  try {
    // Validação do secret para chamadas externas (Power Automate, cron)
    const authHeader = request.headers.get('x-dispatch-secret') || '';
    if (DISPATCH_SECRET && authHeader !== DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));

    // Pode ser chamado com um schedule_id específico ou processar todos os pendentes
    const scheduleId = body.schedule_id || null;

    let schedules = [];
    if (scheduleId) {
      const { data } = await createServiceClient()
        .from('inventory_schedules')
        .select(`*, technicians(id, name, phone, region)`)
        .eq('id', scheduleId)
        .eq('status', 'pending')
        .single();
      if (data) schedules = [data];
    } else {
      schedules = await getPendingSchedulesDue();
    }

    if (schedules.length === 0) {
      return NextResponse.json({ ok: true, dispatched: 0, message: 'Nenhum agendamento pendente' });
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        const tech = schedule.technicians;
        if (!tech?.phone) {
          await createFlowLog({
            source: 'gptmaker',
            level: 'error',
            action: 'dispatch_failed',
            technician_id: schedule.technician_id,
            message: `Técnico ${tech?.name} sem telefone cadastrado`,
          });
          results.push({ schedule_id: schedule.id, ok: false, reason: 'sem_telefone' });
          continue;
        }

        // Busca as peças do técnico (limitado ao items_count do agendamento)
        const allItems = await getTechnicianItems(schedule.technician_id, true);
        if (allItems.length === 0) {
          await createFlowLog({
            source: 'gptmaker',
            level: 'error',
            action: 'dispatch_failed',
            technician_id: schedule.technician_id,
            message: `Técnico ${tech.name} sem peças cadastradas`,
          });
          results.push({ schedule_id: schedule.id, ok: false, reason: 'sem_pecas' });
          continue;
        }

        // Seleciona as peças: prioriza as que não foram contadas no ciclo atual
        // Embaralha e pega os primeiros N itens
        const shuffled = allItems.sort(() => Math.random() - 0.5);
        const selectedItems = shuffled.slice(0, schedule.items_count || 10);

        // Cria o inventário
        const inventory = await createInventory({
          technician_id: schedule.technician_id,
          week_ref: schedule.week_ref,
          total_items: selectedItems.length,
        });

        // Insere os itens no inventário
        const itemRows = selectedItems.map((item) => ({
          inventory_id: inventory.id,
          item_code: item.item_code,
          item_name: item.item_name,
          system_qty: 0, // será atualizado via integração com data lake ou manualmente
          status: 'pending',
        }));

        await createServiceClient().from('inventory_items').insert(itemRows);

        // Atualiza o inventário para "em andamento"
        await updateInventory(inventory.id, {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        });

        // Cria a sessão GPT Maker
        const sessionToken = crypto.randomBytes(32).toString('hex');
        await createGptSession({
          inventory_id: inventory.id,
          technician_id: schedule.technician_id,
          phone: tech.phone,
          session_token: sessionToken,
        });

        // Atualiza o agendamento como disparado
        await updateSchedule(schedule.id, {
          status: 'dispatched',
          inventory_id: inventory.id,
        });

        await createFlowLog({
          source: 'gptmaker',
          level: 'success',
          action: 'inventory_dispatched',
          technician_id: schedule.technician_id,
          inventory_id: inventory.id,
          message: `Inventário criado e sessão iniciada para ${tech.name} — ${selectedItems.length} peças`,
          details: {
            phone: tech.phone,
            session_token: sessionToken,
            items: selectedItems.map((i) => i.item_code),
            first_message: buildFirstMessage(tech.name, selectedItems[0], selectedItems.length),
          },
        });

        results.push({
          schedule_id: schedule.id,
          ok: true,
          inventory_id: inventory.id,
          technician: tech.name,
          phone: tech.phone,
          items_count: selectedItems.length,
          session_token: sessionToken,
          first_message: buildFirstMessage(tech.name, selectedItems[0], selectedItems.length),
        });

      } catch (err) {
        console.error(`[dispatch] schedule ${schedule.id}:`, err);
        results.push({ schedule_id: schedule.id, ok: false, reason: err.message });
      }
    }

    return NextResponse.json({
      ok: true,
      dispatched: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });

  } catch (err) {
    console.error('[webhook/dispatch]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

function buildFirstMessage(techName, firstItem, totalItems) {
  return `Olá, *${techName}*! 👋\n\nChegou a hora do seu inventário semanal.\n\nVocê vai contar *${totalItems} peças* agora. Responda cada pergunta com a quantidade física que você tem em mãos.\n\n---\n\n*1/${totalItems}* — Qual a quantidade física de:\n\n*${firstItem.item_name}*\nCódigo: \`${firstItem.item_code}\`\nSistema: ${firstItem.system_qty}\n\nDigite apenas o número:`;
}
