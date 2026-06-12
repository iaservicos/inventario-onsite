/**
 * app/api/sync/pecas-usadas/route.js
 * Sincroniza pecas USADAS do Datalake -> Supabase (technician_used_items)
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import { getAllTechniciansUsedItems } from '@/lib/databricks';

export const maxDuration = 300;

function isAuthorized(request, session) {
  const secret = request.headers.get('x-dispatch-secret');
  if (secret && secret === process.env.DISPATCH_SECRET) return true;
  const auth = request.headers.get('authorization');
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true;
  if (session?.user?.role === 'admin') return true;
  return false;
}

function detectSubgroup(name) {
  if (!name) return 'Outros';
  const words = name.trim().toUpperCase().split(/\s+/);
  const firstWord = words[0];
  if (firstWord === 'PLM') return 'PLM';
  if (firstWord === 'ADAPT' || firstWord === 'FONTE') return 'Fonte/Adaptador';
  if (firstWord === 'HDD' || firstWord === 'SSD') return 'SSD/HD';
  if (firstWord === 'MON' && words[1] === 'LED') return 'MONITOR';
  if (firstWord === 'MEM') return 'Memoria';
  if (firstWord === 'CONJ.') return 'Diversos';
  if (firstWord === 'LCD') return 'LCD';
  if (firstWord === 'BATER') return 'Bateria';
  if (firstWord === 'PROC') return 'Processador';
  const n = name.toUpperCase();
  if (n.includes('SSD') || n.includes('HD ') || n.includes('DISCO RIGIDO')) return 'SSD/HD';
  if (n.includes('MEM') || n.includes('DDR') || n.includes('DIMM')) return 'Memoria';
  if (n.includes('PLM') || n.includes('PLACA MAE') || n.includes('MOTHERBOARD')) return 'PLM';
  if (n.includes('BAT') || n.includes('LI-ION') || n.includes('BATERIA')) return 'Bateria';
  if (n.includes('LCD') || n.includes('TELA') || n.includes('DISPLAY')) return 'LCD';
  if (n.includes('FONTE') || n.includes('ADAPTADOR') || n.includes('POWER SUPPLY')) return 'Fonte/Adaptador';
  if (n.includes('TECLADO') || n.includes('KBD')) return 'Teclado';
  return 'Outros';
}

async function runSync(triggeredBy) {
  const supabase = createServiceClient();
  const batchId  = `sync-usadas-${Date.now()}`;
  const syncedAt = new Date().toISOString();

  const { data: logRow } = await supabase.from('datalake_sync_log').insert({
    batch_id: batchId, status: 'running', started_at: syncedAt, triggered_by: triggeredBy,
  }).select('id').single();

  try {
    const { data: techs } = await supabase
      .from('technicians')
      .select('id, name, databricks_name')
      .eq('active', true);

    if (!techs?.length) throw new Error('Nenhum tecnico ativo.');

    const techMap = {};
    const techIds = techs.map(t => t.id);
    techs.forEach(t => {
      const name = (t.databricks_name || t.name).trim().toUpperCase();
      techMap[name] = t.id;
    });

    const allItems = await getAllTechniciansUsedItems(Object.keys(techMap));
    if (allItems.length === 0) throw new Error('Datalake retornou zero pecas usadas.');

    await supabase.from('technician_used_items').delete().in('technician_id', techIds);

    const insertRows = allItems.map(item => {
      const techId = techMap[item.technician_name_key];
      if (!techId) return null;
      return {
        technician_id:     techId,
        item_code:         String(item.item_code).trim(),
        item_name:         String(item.item_name).trim(),
        item_subgroup:     detectSubgroup(item.item_name),
        item_quantity:     parseInt(item.item_quantity) || 0,
        item_num_remessa:  String(item.item_num_remessa || '').trim(),
        atp_centro:        String(item.atp_centro || '').trim(),
        atp_nome:          String(item.atp_nome || '').trim(),
        status_consumo:    String(item.status_consumo || '').trim() || null,
        chamado_consumo:   String(item.chamado_consumo || '').trim() || null,
        data_encerramento: item.data_encerramento || null,
        active:            true,
        synced_at:         syncedAt,
        sync_batch_id:     batchId,
        updated_at:        syncedAt,
        unit:              'un',
      };
    }).filter(Boolean);

    for (let i = 0; i < insertRows.length; i += 500) {
      const chunk = insertRows.slice(i, i + 500);
      const { error: insError } = await supabase.from('technician_used_items').insert(chunk);
      if (insError) throw new Error(`Erro ao inserir pecas usadas: ${insError.message}`);
    }

    await supabase.from('datalake_sync_log').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      technicians_total: techs.length,
      technicians_ok: techs.length,
      items_upserted: insertRows.length,
    }).eq('id', logRow.id);

    return {
      ok: true, status: 'success',
      items_upserted: insertRows.length,
      technicians_ok: techs.length,
      batch_id: batchId,
    };

  } catch (err) {
    await supabase.from('datalake_sync_log').update({
      status: 'failed', finished_at: new Date().toISOString(), error_message: err.message,
    }).eq('id', logRow.id);
    throw err;
  }
}

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runSync('cron');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!isAuthorized(request, session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  try {
    const result = await runSync(body.triggered_by || 'api');
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
