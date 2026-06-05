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
    if (!confirm(`Iniciar recontagem para ${techName}?`)) return;
    setRecounting(inventoryId);
    try {
      const res = await fetch(`/api/inventories/${inventoryId}/recount`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Recontagem iniciada: ${data.items_to_recount} peça(s).`);
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
        'Técnico':       d.technicians?.name || '',
        'Região':        d.technicians?.region || '',
        'Semana':        d.inventories?.week_ref || '',
        'Código Item':   d.item_code,
        'Item':          d.item_name,
        'Qtd. Sistema':  d.system_qty,
        'Qtd. Física':   d.physical_qty,
        'Diferença':     d.difference,
        'Variação (%)':  d.percentage_diff,
        'Status':        { open: 'Aberta', recount: 'Recontagem', validated: 'Validada', adjusted: 'Ajustada' }[d.status] || d.status,
        'Data':          d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Divergências');
      ws['!cols'] = [18, 12, 10, 12, 25, 12, 12, 10, 12, 12, 18].map((w) => ({ wch: w }));
      XLSX.writeFile(wb, `relatorio-divergencias-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Relatório exportado!');
    } catch {
      toast.error('Erro ao exportar');
    }
    setExporting(false);
  }

  const critical = divergences.filter((d) => Math.abs(d.percentage_diff) >= 30).length;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Divergências"
        subtitle="Comparativo entre estoque físico e sistema"
        actions={
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting}>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} statusOptions={DIV_STATUS_OPTIONS} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <KpiCard label="Total"        value={divergences.length}                                             alert={divergences.length > 0} />
            <KpiCard label="Críticas ≥30%" value={critical}                                                     alert={critical > 0} />
            <KpiCard label="Abertas"      value={divergences.filter((d) => d.status === 'open').length}         alert />
            <KpiCard label="Recontagem"   value={divergences.filter((d) => d.status === 'recount').length} />
            <KpiCard label="Validadas"    value={divergences.filter((d) => d.status === 'validated').length} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none' }}>
              {divergences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: '#888' }}>Nenhuma divergência encontrada</div>
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
                      const pct           = Number(d.percentage_diff);
                      const isCritical    = pct >= 30;
                      const inventoryId   = d.inventories?.id || d.inventory_id;
                      const isRecounting  = recounting === inventoryId;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: '800', color: '#000' }}>{d.technicians?.name}</td>
                          <td style={{ color: '#666', fontWeight: '600' }}>{d.inventories?.week_ref || '—'}</td>
                          <td>
                            <code style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #eee' }}>
                              {d.item_code}
                            </code>
                          </td>
                          <td style={{ fontWeight: '600' }}>{d.item_name}</td>
                          <td style={{ textAlign: 'right', color: '#666' }}>{d.system_qty}</td>
                          <td style={{ textAlign: 'right', color: '#666' }}>{d.physical_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: Number(d.difference) < 0 ? '#000' : '#555' }}>
                            {Number(d.difference) > 0 ? '+' : ''}{d.difference}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              color: isCritical ? '#fff' : '#000',
                              background: isCritical ? '#000' : 'transparent',
                              padding: isCritical ? '1px 6px' : '0',
                              borderRadius: '4px',
                            }}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td><StatusBadge status={d.status} /></td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                              {d.status === 'open' && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                                  disabled={updating === d.id || isRecounting}
                                  onClick={() => updateStatus(d.id, 'recount')}
                                >
                                  Recontagem
                                </button>
                              )}
                              {d.status === 'open' && inventoryId && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                                  disabled={isRecounting}
                                  onClick={() => triggerRecount(inventoryId, d.technicians?.name)}
                                >
                                  {isRecounting ? '...' : '↺ WhatsApp'}
                                </button>
                              )}
                              {(d.status === 'open' || d.status === 'recount') && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
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

function KpiCard({ label, value, alert: isAlert }) {
  return (
    <div className="card" style={{
      border: `1px solid ${isAlert && value > 0 ? '#000' : '#e8e8e8'}`,
      background: isAlert && value > 0 ? '#000' : '#fff',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: isAlert && value > 0 ? '#fff' : '#888', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: isAlert && value > 0 ? '#fff' : '#000', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
