import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = createServiceClient();

  try {
    const { data: existing } = await db.from('technicians').select('id').limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, message: 'Dados já existem' });
    }

    const { data: techs } = await db.from('technicians').insert([
      { name: 'Carlos Mendes',   region: 'SP - Capital',  phone: '(11) 99001-0001', email: 'carlos.mendes@empresa.com' },
      { name: 'Fernanda Lima',   region: 'SP - Interior', phone: '(11) 99001-0002', email: 'fernanda.lima@empresa.com' },
      { name: 'Juliana Costa',   region: 'MG',            phone: '(31) 99001-0003', email: 'juliana.costa@empresa.com' },
      { name: 'Marcos Oliveira', region: 'PR',            phone: '(41) 99001-0004', email: 'marcos.oliveira@empresa.com' },
      { name: 'Patrícia Alves',  region: 'RS',            phone: '(51) 99001-0005', email: 'patricia.alves@empresa.com' },
      { name: 'Rafael Souza',    region: 'RJ',            phone: '(21) 99001-0006', email: 'rafael.souza@empresa.com' },
    ]).select();

    if (!techs) throw new Error('Erro ao criar técnicos');

    const now = new Date();
    const inv = (offsetH, status, counted, divergences, techIdx) => ({
      technician_id: techs[techIdx].id,
      status,
      week_ref: 'S01-2026',
      started_at: new Date(now - offsetH * 3600000).toISOString(),
      completed_at: status === 'completed' ? new Date(now - (offsetH - 1) * 3600000).toISOString() : null,
      total_items: 10,
      counted_items: counted,
      divergence_count: divergences,
    });

    const { data: invs } = await db.from('inventories').insert([
      inv(49, 'completed', 10, 2, 0),
      inv(50, 'completed', 10, 0, 1),
      inv(6,  'in_progress', 8, 0, 2),
      inv(5,  'abandoned', 3, 0, 3),
      inv(4,  'recount_pending', 10, 3, 4),
      inv(3,  'completed', 10, 0, 5),
    ]).select();

    if (!invs) throw new Error('Erro ao criar inventários');

    await db.from('alerts').insert([
      { type: 'abandonment', severity: 'high', technician_id: techs[3].id, inventory_id: invs[3].id, title: 'Abandono de inventário — Marcos Oliveira', description: 'Técnico abandonou o inventário da semana S01-2026 após 30 minutos sem completar.' },
      { type: 'recount_pending', severity: 'medium', technician_id: techs[4].id, inventory_id: invs[4].id, title: 'Recontagem pendente — Patrícia Alves', description: '3 itens com divergência aguardando recontagem há mais de 4 horas.' },
    ]);

    await db.from('divergences').insert([
      { inventory_id: invs[4].id, technician_id: techs[4].id, item_code: 'PT-001', item_name: 'Cabo de Rede Cat6',  system_qty: 50, physical_qty: 49, difference: -1, percentage_diff: 2.00,  status: 'recount' },
      { inventory_id: invs[4].id, technician_id: techs[4].id, item_code: 'PT-002', item_name: 'Switch 24 Portas',   system_qty: 5,  physical_qty: 3,  difference: -2, percentage_diff: 40.00, status: 'recount' },
      { inventory_id: invs[4].id, technician_id: techs[4].id, item_code: 'PT-003', item_name: 'Roteador Wi-Fi',     system_qty: 8,  physical_qty: 5,  difference: -3, percentage_diff: 37.50, status: 'recount' },
      { inventory_id: invs[0].id, technician_id: techs[0].id, item_code: 'PT-001', item_name: 'Cabo de Rede Cat6',  system_qty: 50, physical_qty: 49, difference: -1, percentage_diff: 2.00,  status: 'open' },
      { inventory_id: invs[0].id, technician_id: techs[0].id, item_code: 'PT-002', item_name: 'Switch 24 Portas',   system_qty: 5,  physical_qty: 3,  difference: -2, percentage_diff: 40.00, status: 'open' },
    ]);

    await db.from('flow_logs').insert([
      { source: 'power_automate', level: 'success', action: 'inventory_started',   technician_id: techs[0].id, inventory_id: invs[0].id, message: 'Inventário iniciado para Carlos Mendes — S01-2026' },
      { source: 'dispara_ai',     level: 'success', action: 'message_sent',        technician_id: techs[0].id, inventory_id: invs[0].id, message: 'Mensagem de início enviada via WhatsApp' },
      { source: 'power_automate', level: 'success', action: 'inventory_completed', technician_id: techs[0].id, inventory_id: invs[0].id, message: 'Inventário concluído — 10/10 itens contados' },
      { source: 'power_automate', level: 'warning', action: 'inventory_started',   technician_id: techs[3].id, inventory_id: invs[3].id, message: 'Inventário iniciado para Marcos Oliveira — S01-2026' },
      { source: 'power_automate', level: 'error',   action: 'inventory_abandoned', technician_id: techs[3].id, inventory_id: invs[3].id, message: 'Abandono detectado — inventário incompleto após timeout' },
      { source: 'dispara_ai',     level: 'error',   action: 'alert_sent',          technician_id: techs[3].id, inventory_id: invs[3].id, message: 'Alerta de abandono enviado ao supervisor' },
      { source: 'power_automate', level: 'warning', action: 'divergence_detected', technician_id: techs[4].id, inventory_id: invs[4].id, message: '3 divergências detectadas — recontagem solicitada' },
      { source: 'dispara_ai',     level: 'success', action: 'message_sent',        technician_id: techs[4].id, inventory_id: invs[4].id, message: 'Solicitação de recontagem enviada via WhatsApp' },
    ]);

    await db.from('integration_health').upsert([
      { integration: 'power_automate', status: 'healthy',  response_time_ms: 320,  success_rate: 98.50, error_count: 1, last_check: new Date().toISOString() },
      { integration: 'dispara_ai',     status: 'degraded', response_time_ms: 1850, success_rate: 91.20, error_count: 4, last_check: new Date().toISOString() },
    ], { onConflict: 'integration' });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Seed]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
