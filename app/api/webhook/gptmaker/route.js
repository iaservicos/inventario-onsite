import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import {
  getGptSessionByToken,
  updateGptSession,
  getActiveSessionByPhone,
} from '@/lib/db-gptmaker';
import {
  updateInventory,
  createFlowLog,
  createAlert,
} from '@/lib/db';

const WEBHOOK_SECRET = process.env.GPTMAKER_WEBHOOK_SECRET || '';

export async function POST(request) {
  try {
    // Valida secret enviado pelo GPT Maker no header x-gptmaker-secret
    if (WEBHOOK_SECRET) {
      const incoming = request.headers.get('x-gptmaker-secret')
        ?? request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (incoming !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const body = await request.json();

    // Validação básica do payload do GPT Maker
    // O GPT Maker envia: { phone, message, session_token, variables }
    const { phone, message, session_token, variables } = body;

    if (!phone) {
      return NextResponse.json({ error: 'phone obrigatório' }, { status: 400 });
    }

    // Busca sessão ativa pelo token ou pelo telefone
    let session = null;
    if (session_token) {
      session = await getGptSessionByToken(session_token);
    }
    if (!session) {
      session = await getActiveSessionByPhone(phone);
    }

    if (!session) {
      return NextResponse.json({ ok: false, message: 'Nenhuma sessão ativa para este número' }, { status: 200 });
    }

    const inventoryId = session.inventory_id;
    const technicianId = session.technician_id;

    // Busca os itens do inventário atual ordenados
    const { data: items } = await createServiceClient()
      .from('inventory_items')
      .select('*')
      .eq('inventory_id', inventoryId)
      .order('id', { ascending: true });

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: false, message: 'Sem itens no inventário' }, { status: 200 });
    }

    const currentIndex = session.current_item_index;
    const currentItem = items[currentIndex];

    if (!currentItem) {
      // Todos os itens já foram respondidos
      await finishInventory(session, inventoryId, technicianId, items);
      return NextResponse.json({ ok: true, action: 'completed' });
    }

    // Interpreta a resposta do técnico como quantidade física
    const rawAnswer = String(message || '').trim().replace(',', '.');
    const physicalQty = parseFloat(rawAnswer);

    if (isNaN(physicalQty) || physicalQty < 0) {
      // Resposta inválida — solicita novamente
      await createFlowLog({
        source: 'gptmaker',
        level: 'warning',
        action: 'invalid_answer',
        technician_id: technicianId,
        inventory_id: inventoryId,
        message: `Resposta inválida para item ${currentItem.item_code}: "${message}"`,
      });
      return NextResponse.json({
        ok: true,
        action: 'ask_again',
        reply: `Não entendi. Por favor, informe apenas o número da quantidade física de *${currentItem.item_name}* (${currentItem.item_code}).`,
      });
    }

    // Registra a contagem do item atual
    const difference = physicalQty - Number(currentItem.system_qty);
    const hasDivergence = Math.abs(difference) > 0;
    const percentageDiff = currentItem.system_qty > 0
      ? Math.abs((difference / Number(currentItem.system_qty)) * 100)
      : (physicalQty > 0 ? 100 : 0);

    await createServiceClient()
      .from('inventory_items')
      .update({
        physical_qty: physicalQty,
        has_divergence: hasDivergence,
        status: 'counted',
        counted_at: new Date().toISOString(),
      })
      .eq('id', currentItem.id);

    // Se houver divergência, registra na tabela divergences
    if (hasDivergence) {
      const { data: existingDiv } = await createServiceClient()
        .from('divergences')
        .select('id')
        .eq('inventory_id', inventoryId)
        .eq('item_code', currentItem.item_code)
        .maybeSingle();

      if (existingDiv) {
        await createServiceClient()
          .from('divergences')
          .update({
            physical_qty: physicalQty,
            difference,
            percentage_diff: percentageDiff.toFixed(2),
            status: 'open',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDiv.id);
      } else {
        await createServiceClient()
          .from('divergences')
          .insert({
            inventory_id: inventoryId,
            technician_id: technicianId,
            item_code: currentItem.item_code,
            item_name: currentItem.item_name,
            system_qty: currentItem.system_qty,
            physical_qty: physicalQty,
            difference,
            percentage_diff: percentageDiff.toFixed(2),
            status: 'open',
          });
      }
    }

    await createFlowLog({
      source: 'gptmaker',
      level: 'info',
      action: 'item_counted',
      technician_id: technicianId,
      inventory_id: inventoryId,
      message: `${currentItem.item_code} — Sistema: ${currentItem.system_qty} | Físico: ${physicalQty}${hasDivergence ? ' ⚠ Divergência' : ''}`,
    });

    // Avança para o próximo item
    const nextIndex = currentIndex + 1;
    const nextItem = items[nextIndex];

    // Atualiza contadores do inventário
    const countedSoFar = items.filter((i, idx) => idx <= currentIndex).length;
    const divergenceCount = items.filter((i, idx) => idx <= currentIndex && i.has_divergence).length + (hasDivergence ? 1 : 0);

    await updateInventory(inventoryId, {
      counted_items: countedSoFar,
      divergence_count: divergenceCount,
      updated_at: new Date().toISOString(),
    });

    if (!nextItem) {
      // Era o último item — finaliza
      await finishInventory(session, inventoryId, technicianId, [...items.slice(0, currentIndex), { ...currentItem, physical_qty: physicalQty, has_divergence: hasDivergence }]);
      return NextResponse.json({
        ok: true,
        action: 'completed',
        reply: buildCompletionMessage(items, physicalQty, currentItem, hasDivergence, divergenceCount),
      });
    }

    // Próximo item
    await updateGptSession(session.id, {
      current_item_index: nextIndex,
      status: 'waiting_answer',
      last_message_at: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      action: 'next_item',
      progress: `${nextIndex}/${items.length}`,
      reply: buildItemQuestion(nextItem, nextIndex, items.length, hasDivergence, difference),
    });

  } catch (err) {
    console.error('[webhook/gptmaker]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function finishInventory(session, inventoryId, technicianId, items) {
  const divergenceCount = items.filter((i) => i.has_divergence).length;

  await updateInventory(inventoryId, {
    status: divergenceCount > 0 ? 'recount_pending' : 'completed',
    completed_at: new Date().toISOString(),
    counted_items: items.length,
    divergence_count: divergenceCount,
    updated_at: new Date().toISOString(),
  });

  await updateGptSession(session.id, {
    status: 'completed',
    last_message_at: new Date().toISOString(),
  });

  if (divergenceCount > 0) {
    await createAlert({
      type: 'recount_pending',
      severity: divergenceCount >= 3 ? 'high' : 'medium',
      technician_id: technicianId,
      inventory_id: inventoryId,
      title: `${divergenceCount} divergência(s) encontrada(s)`,
      description: `Técnico finalizou o inventário com ${divergenceCount} peça(s) divergente(s). Recontagem necessária.`,
    });
  }

  await createFlowLog({
    source: 'gptmaker',
    level: 'success',
    action: 'inventory_completed',
    technician_id: technicianId,
    inventory_id: inventoryId,
    message: `Inventário finalizado. ${items.length} itens contados. ${divergenceCount} divergência(s).`,
  });
}

function buildItemQuestion(item, index, total, lastHadDivergence, lastDifference) {
  let prefix = '';
  if (lastHadDivergence) {
    const signal = lastDifference > 0 ? '+' : '';
    prefix = `✅ Registrado (diferença: ${signal}${lastDifference})\n\n`;
  } else {
    prefix = `✅ Ok!\n\n`;
  }
  return `${prefix}*${index + 1}/${total}* — Qual a quantidade física de:\n\n*${item.item_name}*\nCódigo: \`${item.item_code}\`\nSistema: ${item.system_qty}\n\nDigite apenas o número:`;
}

function buildCompletionMessage(items, lastPhysical, lastItem, lastHadDivergence, totalDivergences) {
  const signal = lastHadDivergence ? `⚠ Diferença registrada em ${lastItem.item_name}.` : `✅ Ok!`;
  if (totalDivergences > 0) {
    return `${signal}\n\n✅ *Inventário finalizado!*\n\nTotal de itens: ${items.length}\nDivergências: ${totalDivergences}\n\nO supervisor foi notificado. Aguarde instruções para recontagem.`;
  }
  return `${signal}\n\n🎉 *Inventário finalizado com sucesso!*\n\nTodos os ${items.length} itens foram contados sem divergências. Obrigado!`;
}
