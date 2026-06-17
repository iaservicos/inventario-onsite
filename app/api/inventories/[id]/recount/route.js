import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function POST(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'supervisor'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const inventoryId = parseInt(params.id);
  const supabase = createServiceClient();

  // 1. Busca inventário com técnico
  const { data: inventory, error } = await supabase
    .from('inventories')
    .select('id, technician_id, week_ref, status, technicians(id, name, phone)')
    .eq('id', inventoryId)
    .single();

  if (error || !inventory) {
    return NextResponse.json({ error: 'Inventário não encontrado' }, { status: 404 });
  }

  // 2. Busca peças que precisam de recontagem (status = recount)
  const { data: recountItems } = await supabase
    .from('inventory_items')
    .select('id, item_code, item_name, system_qty, physical_qty')
    .eq('inventory_id', inventoryId)
    .eq('status', 'recount');

  if (!recountItems || recountItems.length === 0) {
    return NextResponse.json({ error: 'Nenhuma peça para recontagem encontrada' }, { status: 400 });
  }

  const tech = inventory.technicians;
  const techName = tech?.name || 'Técnico';
  const firstName = techName.split(' ')[0];

  // 3. Monta mensagem com as peças divergentes
  const listaItens = recountItems
    .map((item, i) =>
      `📦 *${i + 1}. ${item.item_name}*\n` +
      `Código: \`${item.item_code}\`\n` +
      `Você informou: *${Number(item.physical_qty)}* | Sistema: *${Number(item.system_qty)}*`
    )
    .join('\n\n');

  const message =
    `Olá, ${firstName}! 👋\n\n` +
    `Encontramos *${recountItems.length}* peça(s) com divergência no inventário da semana *${inventory.week_ref}*.\n\n` +
    `Por favor, recontar as peças abaixo e informar a quantidade correta:\n\n` +
    listaItens +
    `\n\nResponda com o código e a quantidade. Exemplo:\n*11128693 = 5*`;

  // 4. Marca inventário como recount_pending
  await supabase
    .from('inventories')
    .update({ status: 'recount_pending', updated_at: new Date().toISOString() })
    .eq('id', inventoryId);

  // 5. Alerta para o supervisor
  await supabase.from('alerts').insert({
    type:          'recount',
    severity:      'medium',
    title:         `Recontagem iniciada — ${techName}`,
    description:   `${recountItems.length} peça(s) divergente(s) aguardando recontagem.`,
    technician_id: inventory.technician_id,
    inventory_id:  inventoryId,
    resolved:      false,
    created_at:    new Date().toISOString(),
  });

  return NextResponse.json({
    ok:               true,
    inventory_id:     inventoryId,
    items_to_recount: recountItems.length,
  });
}
