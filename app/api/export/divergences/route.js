import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { authOptions } from '../../auth/[...nextauth]/route';
import { getDivergences } from '@/lib/db';

const DIVERGENCE_STATUS = {
  open: 'Aberta',
  recount: 'Em Recontagem',
  validated: 'Validada',
  adjusted: 'Ajustada',
};

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const technicianId = searchParams.get('technicianId') || '';
  const status = searchParams.get('status') || '';

  const divergences = await getDivergences({
    from,
    to,
    technicianId: technicianId || undefined,
    status: status || undefined,
  });

  const rows = divergences.map((d) => ({
    Técnico: d.technicians?.name || '—',
    Região: d.technicians?.region || '—',
    'Semana Ref.': d.inventories?.week_ref || '—',
    'Código do Item': d.item_code,
    'Nome do Item': d.item_name,
    'Qtd. Sistema': Number(d.system_qty),
    'Qtd. Física': Number(d.physical_qty),
    Diferença: Number(d.difference),
    'Variação (%)': Number(d.percentage_diff),
    Status: DIVERGENCE_STATUS[d.status] || d.status,
    'Qtd. Recontagem': d.recount_qty != null ? Number(d.recount_qty) : '—',
    Observações: d.notes || '—',
    'Registrado em': d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '—',
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  ws['!cols'] = [
    { wch: 22 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 24 },
    { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 16 },
    { wch: 16 }, { wch: 24 }, { wch: 20 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Divergências');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="divergencias-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
