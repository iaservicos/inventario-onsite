'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDuration, calcCompletionRate } from '@/lib/utils';
import { toast } from 'sonner';

export default function TecnicosPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [dbChecking, setDbChecking] = useState(null);
  const [dbStatus, setDbStatus] = useState({});

  async function checkDatabricks(techId) {
    setDbChecking(techId);
    try {
      const res = await fetch(`/api/technicians/${techId}/sync-items`);
      const data = await res.json();
      setDbStatus((prev) => ({ ...prev, [techId]: data }));
      if (data.found_in_databricks) {
        toast.success(`${data.technician_name}: ${data.total_items} peças no Databricks`);
      } else {
        toast.error(`${data.technician_name}: não encontrado no Databricks. Verifique o nome.`);
      }
    } catch {
      toast.error('Erro ao verificar Databricks');
    }
    setDbChecking(null);
  }

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
    const res = await fetch(`/api/inventories?${params}`);
    const json = await res.json();
    setInventories(json);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const byTech = technicians.map((t) => {
    const invs = inventories.filter((i) => i.technician_id === t.id);
    const completed = invs.filter((i) => i.status === 'completed').length;
    const totalDivergences = invs.reduce((s, i) => s + (i.divergence_count || 0), 0);
    const rate = invs.length > 0 ? Math.round((completed / invs.length) * 100) : 0;
    return { ...t, invs, completed, totalDivergences, rate };
  }).filter((t) => t.invs.length > 0 || !filters.technicianId);

  async function exportExcel() {
    setExporting(true);
    try {
      const rows = inventories.map((inv) => ({
        'Técnico': inv.technicians?.name || '',
        'Região': inv.technicians?.region || '',
        'Semana': inv.week_ref || '',
        'Status': { pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluído', abandoned: 'Abandonado', recount_pending: 'Recontagem' }[inv.status] || inv.status,
        'Total Itens': inv.total_items,
        'Itens Contados': inv.counted_items,
        'Divergências': inv.divergence_count,
        'Início': inv.started_at ? new Date(inv.started_at).toLocaleString('pt-BR') : '',
        'Conclusão': inv.completed_at ? new Date(inv.completed_at).toLocaleString('pt-BR') : '',
        'Duração': formatDuration(inv.started_at, inv.completed_at),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Técnicos');

      const colWidths = [20, 15, 10, 15, 12, 14, 13, 20, 20, 12];
      ws['!cols'] = colWidths.map((w) => ({ wch: w }));

      XLSX.writeFile(wb, `relatorio-tecnicos-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Relatório exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar relatório');
    }
    setExporting(false);
  }

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }}>
      <PageHeader
        title="Técnicos"
        subtitle="Desempenho e status dos inventários por técnico"
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

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '1.25rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#525252' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            {byTech.map((t) => (
              <div key={t.id} className="card card-hover">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%',
                      background: '#222222',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem', fontWeight: '700', color: '#a3a3a3',
                      border: '1px solid #2a2a2a', flexShrink: 0,
                    }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', color: '#f0f0f0' }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#525252' }}>{t.region || '—'}</div>
                    {dbStatus[t.id] && (
                      <div style={{ fontSize: '0.7rem', marginTop: '2px', color: dbStatus[t.id].found_in_databricks ? '#a3a3a3' : '#737373' }}>
                        {dbStatus[t.id].found_in_databricks
                          ? `Databricks: ${dbStatus[t.id].total_items} peças`
                          : 'Não encontrado no Databricks'}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.65rem', padding: '0.2rem 0.45rem', flexShrink: 0 }}
                    disabled={dbChecking === t.id}
                    onClick={() => checkDatabricks(t.id)}
                    title="Verificar peças no Databricks"
                  >
                    {dbChecking === t.id ? '...' : 'DB'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
                  <Metric label="Inventários" value={t.invs.length} />
                  <Metric label="Concluídos" value={t.completed} />
                  <Metric label="Divergências" value={t.totalDivergences} color={t.totalDivergences > 0 ? '#f0f0f0' : '#525252'} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#737373', marginBottom: '4px' }}>
                    <span>Taxa de conclusão</span>
                    <span style={{ fontWeight: '600', color: '#f0f0f0' }}>
                      {t.rate}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${t.rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: '1rem' }}>Todos os Inventários</div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Região</th>
                    <th>Semana</th>
                    <th>Status</th>
                    <th>Progresso</th>
                    <th>Divergências</th>
                    <th>Duração</th>
                    <th>Início</th>
                  </tr>
                </thead>
                <tbody>
                  {inventories.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#525252', padding: '2rem' }}>Nenhum inventário encontrado</td></tr>
                  ) : inventories.map((inv) => {
                    const pct = inv.total_items > 0 ? Math.round((inv.counted_items / inv.total_items) * 100) : 0;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '500', color: '#f0f0f0' }}>{inv.technicians?.name}</td>
                        <td style={{ color: '#737373' }}>{inv.technicians?.region || '—'}</td>
                        <td style={{ color: '#737373' }}>{inv.week_ref || '—'}</td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '70px' }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#737373' }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          {inv.divergence_count > 0
                            ? <span style={{ color: '#f0f0f0', fontWeight: '600' }}>{inv.divergence_count}</span>
                            : <span style={{ color: '#525252' }}>0</span>}
                        </td>
                        <td style={{ color: '#737373', fontSize: '0.8rem' }}>{formatDuration(inv.started_at, inv.completed_at)}</td>
                        <td style={{ color: '#737373', fontSize: '0.8rem' }}>{formatDate(inv.started_at || inv.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.5rem', background: '#222222', borderRadius: '6px', border: '1px solid #2a2a2a' }}>
      <div style={{ fontSize: '1.25rem', fontWeight: '700', color: color || '#f0f0f0' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#525252', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    </div>
  );
}
