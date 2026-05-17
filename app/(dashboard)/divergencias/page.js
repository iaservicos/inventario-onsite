'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const DIV_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: 'Aberta' },
  { value: 'recount', label: 'Recontagem' },
  { value: 'validated', label: 'Validada' },
  { value: 'adjusted', label: 'Ajustada' },
];

export default function DivergenciasPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [divergences, setDivergences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [recounting, setRecounting] = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    if (filters.status) params.set('status', filters.status);
    const res = await fetch(`/api/divergences?${params}`);
    const json = await res.json();
    setDivergences(json);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id, status) {
    setUpdating(id);
    try {
      await fetch(`/api/divergences/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      toast.success('Status atualizado!');
      load();
    } catch {
      toast.error('Erro ao atualizar status');
    }
    setUpdating(null);
  }

  async function triggerRecount(inventoryId, techName) {
    if (!confirm(`Iniciar recontagem automática para ${techName}?\n\nO sistema criará um novo inventário apenas com as peças divergentes e enviará mensagem ao técnico via WhatsApp.`)) return;
    setRecounting(inventoryId);
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/recount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Recontagem criada: ${data.items_to_recount} peça(s). ${data.dispatched ? 'Mensagem enviada ao técnico.' : 'Técnico sem telefone — envie manualmente.'}`);
        load();
      } else {
        toast.error(data.error || 'Erro ao criar recontagem');
      }
    } catch {
      toast.error('Erro de conexão');
    }
    setRecounting(null);
  }

  async function exportExcel() {
    setExporting(true);
    try {
      const rows = divergences.map((d) => ({
        'Técnico': d.technicians?.name || '',
        'Região': d.technicians?.region || '',
        'Semana': d.inventories?.week_ref || '',
        'Código Item': d.item_code,
        'Item': d.item_name,
        'Qtd. Sistema': d.system_qty,
        'Qtd. Física': d.physical_qty,
        'Diferença': d.difference,
        'Variação (%)': d.percentage_diff,
        'Status': { open: 'Aberta', recount: 'Recontagem', validated: 'Validada', adjusted: 'Ajustada' }[d.status] || d.status,
        'Data': d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Divergências');
      ws['!cols'] = [18, 12, 10, 12, 25, 12, 12, 10, 12, 12, 18].map((w) => ({ wch: w }));
      XLSX.writeFile(wb, `relatorio-divergencias-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Relatório exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar relatório');
    }
    setExporting(false);
  }

  const totalDiff = divergences.reduce((s, d) => s + Math.abs(Number(d.difference)), 0);
  const critical = divergences.filter((d) => Math.abs(d.percentage_diff) >= 30).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }}>
      <PageHeader
        title="Divergências"
        subtitle="Comparativo entre estoque físico e sistema"
        actions={
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} statusOptions={DIV_STATUS_OPTIONS} />

      <div style={{ height: '1.25rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <SummaryCard label="Total de Divergências" value={divergences.length} />
            <SummaryCard label="Críticas (≥30%)" value={critical} />
            <SummaryCard label="Abertas" value={divergences.filter((d) => d.status === 'open').length} />
            <SummaryCard label="Em Recontagem" value={divergences.filter((d) => d.status === 'recount').length} />
            <SummaryCard label="Validadas" value={divergences.filter((d) => d.status === 'validated').length} />
          </div>

          <div className="card">
            <div className="table-wrapper">
              {divergences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Nenhuma divergência encontrada</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Semana</th>
                      <th>Código</th>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Sistema</th>
                      <th style={{ textAlign: 'right' }}>Físico</th>
                      <th style={{ textAlign: 'right' }}>Diferença</th>
                      <th style={{ textAlign: 'right' }}>Variação</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divergences.map((d) => {
                      const pct = Number(d.percentage_diff);
                      const diffColor = pct >= 30 ? '#f1f5f9' : pct >= 10 ? '#94a3b8' : '#64748b';
                      const inventoryId = d.inventories?.id || d.inventory_id;
                      const isRecounting = recounting === inventoryId;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: '500', color: '#f1f5f9' }}>{d.technicians?.name}</td>
                          <td style={{ color: '#64748b' }}>{d.inventories?.week_ref || '—'}</td>
                          <td><code style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{d.item_code}</code></td>
                          <td>{d.item_name}</td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>{d.system_qty}</td>
                          <td style={{ textAlign: 'right', color: '#64748b' }}>{d.physical_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: '600', color: Number(d.difference) < 0 ? '#f1f5f9' : '#64748b' }}>
                            {Number(d.difference) > 0 ? '+' : ''}{d.difference}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{ fontWeight: '600', color: diffColor }}>{pct.toFixed(1)}%</span>
                          </td>
                          <td><StatusBadge status={d.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                              {d.status === 'open' && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                  disabled={updating === d.id || isRecounting}
                                  onClick={() => updateStatus(d.id, 'recount')}
                                >
                                  Marcar Recontagem
                                </button>
                              )}
                              {d.status === 'open' && inventoryId && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', color: '#f1f5f9', borderColor: '#cbd5e1' }}
                                  disabled={isRecounting}
                                  onClick={() => triggerRecount(inventoryId, d.technicians?.name)}
                                >
                                  {isRecounting ? 'Criando...' : 'Recontar via WhatsApp'}
                                </button>
                              )}
                              {(d.status === 'open' || d.status === 'recount') && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                                  disabled={updating === d.id}
                                  onClick={() => updateStatus(d.id, 'validated')}
                                >
                                  Validar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div style={{ padding: '0.75rem 1rem', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
      <span style={{ fontSize: '1.375rem', fontWeight: '700', color: '#f1f5f9' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{label}</span>
    </div>
  );
}
