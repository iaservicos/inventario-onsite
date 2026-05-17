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
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Técnicos"
        subtitle="Desempenho e status dos inventários por técnico"
        actions={
          <button className="btn btn-primary" onClick={exportExcel} disabled={exporting}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '2rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#000000', fontWeight: '700' }}>Carregando dados...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {byTech.map((t) => (
              <div key={t.id} className="card card-hover" style={{ border: '2px solid #e0e0e0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div
                    style={{
                      width: '48px', height: '48px', borderRadius: '50%',
                      background: '#000000',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1.25rem', fontWeight: '800', color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', color: '#000000', fontSize: '1.1rem', lineHeight: 1.2 }}>{t.name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#333333', fontWeight: '600', marginTop: '2px' }}>{t.region || '—'}</div>
                    {dbStatus[t.id] && (
                      <div style={{ fontSize: '0.75rem', marginTop: '4px', color: dbStatus[t.id].found_in_databricks ? '#000000' : '#b71c1c', fontWeight: '700' }}>
                        {dbStatus[t.id].found_in_databricks
                          ? `Datalake: ${dbStatus[t.id].total_items} peças`
                          : 'Não encontrado no Datalake'}
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem', flexShrink: 0, fontWeight: '800' }}
                    disabled={dbChecking === t.id}
                    onClick={() => checkDatabricks(t.id)}
                    title="Verificar peças no Databricks"
                  >
                    {dbChecking === t.id ? '...' : 'DB'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                  <Metric label="Invs" value={t.invs.length} />
                  <Metric label="Feitos" value={t.completed} />
                  <Metric label="Diverg" value={t.totalDivergences} color={t.totalDivergences > 0 ? '#b71c1c' : '#000000'} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#000000', marginBottom: '6px', fontWeight: '700' }}>
                    <span>Taxa de conclusão</span>
                    <span style={{ fontWeight: '900' }}>
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

          <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000' }}>
            <div style={{ padding: '1.5rem', background: '#f0f0f0', borderBottom: '2px solid #000000' }}>
              <div className="section-title">Todos os Inventários</div>
            </div>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
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
                    <tr><td colSpan={8} style={{ textAlign: 'center', color: '#000000', padding: '4rem', fontWeight: '700' }}>Nenhum inventário encontrado</td></tr>
                  ) : inventories.map((inv) => {
                    const pct = inv.total_items > 0 ? Math.round((inv.counted_items / inv.total_items) * 100) : 0;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '800', color: '#000000' }}>{inv.technicians?.name}</td>
                        <td style={{ color: '#000000', fontWeight: '600' }}>{inv.technicians?.region || '—'}</td>
                        <td style={{ color: '#000000', fontWeight: '600' }}>{inv.week_ref || '—'}</td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div className="progress-bar" style={{ width: '80px' }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#000000', fontWeight: '800' }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          {inv.divergence_count > 0
                            ? <span style={{ color: '#b71c1c', fontWeight: '900', fontSize: '1rem' }}>{inv.divergence_count}</span>
                            : <span style={{ color: '#000000', fontWeight: '600' }}>0</span>}
                        </td>
                        <td style={{ color: '#333333', fontSize: '0.85rem', fontWeight: '600' }}>{formatDuration(inv.started_at, inv.completed_at)}</td>
                        <td style={{ color: '#333333', fontSize: '0.85rem', fontWeight: '600' }}>{formatDate(inv.started_at || inv.created_at)}</td>
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
    <div style={{ 
      textAlign: 'center', 
      padding: '0.75rem 0.5rem', 
      background: '#f9f9f9', 
      borderRadius: '8px', 
      border: '1px solid #d0d0d0',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)'
    }}>
      <div style={{ fontSize: '1.5rem', fontWeight: '900', color: color || '#000000', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: '#333333', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '800', marginTop: '4px' }}>{label}</div>
    </div>
  );
}
