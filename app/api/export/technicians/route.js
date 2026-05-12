import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getInventories, getAllTechnicians } from '@/lib/db';
import { STATUS_LABELS, formatDuration } from '@/lib/utils';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const technicianId = searchParams.get('technicianId') || '';
  const status = searchParams.get('status') || '';

  const [technicians, inventories] = await Promise.all([
    getAllTechnicians(),
    getInventories({ from, to, technicianId: technicianId || undefined, status: status || undefined }),
  ]);

  const techMap = {};
  technicians.forEach((t) => {
    techMap[t.id] = {
      name: t.name,
      region: t.region,
      total: 0,
      completed: 0,
      abandoned: 0,
      recount: 0,
      divergences: 0,
    };
  });

  inventories.forEach((inv) => {
    const t = techMap[inv.technician_id];
    if (!t) return;
    t.total++;
    if (inv.status === 'completed') t.completed++;
    if (inv.status === 'abandoned') t.abandoned++;
    if (inv.status === 'recount_pending') t.recount++;
    t.divergences += inv.divergence_count || 0;
  });

  const rows = Object.values(techMap).map((t) => ({
    Técnico: t.name,
    Região: t.region || '—',
    'Total de Inventários': t.total,
    Concluídos: t.completed,
    Abandonados: t.abandoned,
    'Recontagem Pendente': t.recount,
    'Taxa de Conclusão (%)': t.total > 0 ? Math.round((t.completed / t.total) * 100) : 0,
    'Total de Divergências': t.divergences,
  }));

  const detailRows = inventories.map((inv) => ({
    Técnico: inv.technicians?.name || '—',
    Região: inv.technicians?.region || '—',
    'Semana Ref.': inv.week_ref || '—',
    Status: STATUS_LABELS[inv.status] || inv.status,
    'Itens Contados': `${inv.counted_items || 0}/${inv.total_items || 0}`,
    Divergências: inv.divergence_count || 0,
    Duração: formatDuration(inv.started_at, inv.completed_at),
    'Iniciado em': inv.started_at ? new Date(inv.started_at).toLocaleString('pt-BR') : '—',
    'Concluído em': inv.completed_at ? new Date(inv.completed_at).toLocaleString('pt-BR') : '—',
  }));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(rows);
  const ws2 = XLSX.utils.json_to_sheet(detailRows);

  ws1['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 22 }, { wch: 22 }];
  ws2['!cols'] = [{ wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 20 }, { wch: 20 }];

  XLSX.utils.book_append_sheet(wb, ws1, 'Resumo por Técnico');
  XLSX.utils.book_append_sheet(wb, ws2, 'Detalhe de Inventários');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="tecnicos-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
