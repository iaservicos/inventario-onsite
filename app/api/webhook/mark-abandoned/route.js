import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const auth = req.headers.get('x-dispatch-secret');
    if (auth !== process.env.DISPATCH_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { nome, inventory_id } = body;

    if (!nome && !inventory_id) {
      return NextResponse.json({ error: 'Informe nome ou inventory_id' }, { status: 400 });
    }

    const supabase = createServiceClient();
    const now = new Date().toISOString();

    let inventory = null;

    if (inventory_id) {
      const { data } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, technicians(name), inventory_schedules(id)')
        .eq('id', parseInt(inventory_id))
        .maybeSingle();
      inventory = data;
    } else {
      const { data: tech } = await supabase
        .from('technicians')
        .select('id, name')
        .ilike('name', `%${String(nome).trim()}%`)
        .limit(1)
        .maybeSingle();

      if (!tech) return NextResponse.json({ error: 'Técnico não encontrado' }, { status: 404 });

      const { data } = await supabase
        .from('inventories')
        .select('id, technician_id, week_ref, technicians(name), inventory_schedules(id)')
        .eq('technician_id', tech.id)
        .in('status', ['in_progress', 'pending', 'recount_pending'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      inventory = data;
    }

    if (!inventory) {
      return NextResponse.json({ error: 'Inventário ativo não encontrado' }, { status: 404 });
    }

    // Marca inventário como abandonado
    await supabase
      .from('inventories')
      .update({ status: 'abandoned', updated_at: now })
      .eq('id', inventory.id);

    // Marca agendamento como abandonado
    const schedId = inventory.inventory_schedules?.[0]?.id;
    if (schedId) {
      await supabase
        .from('inventory_schedules')
        .update({ status: 'abandoned', updated_at: now })
        .eq('id', schedId);
    }

    // Cria alerta
    const techName = inventory.technicians?.name || nome || 'Técnico';
    await supabase.from('alerts').insert({
      type:          'abandonment',
      severity:      'high',
      title:         `Inventário abandonado — ${techName}`,
      description:   `O técnico ${techName} abandonou o inventário da semana ${inventory.week_ref}.`,
      technician_id: inventory.technician_id,
      inventory_id:  inventory.id,
      resolved:      false,
      created_at:    now,
    });

    return NextResponse.json({
      ok:           true,
      inventory_id: inventory.id,
      technician:   techName,
      week_ref:     inventory.week_ref,
      status:       'abandoned',
    });

  } catch (err) {
    console.error('[mark-abandoned]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
