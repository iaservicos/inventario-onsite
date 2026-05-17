'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDuration } from '@/lib/utils';
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
        toast.success(`${data.technician_name}: ${data.total_items} peças`);
      } else {
        toast.error('Não encontrado no Datalake');
      }
    } catch {
      toast.error('Erro de conexão');
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

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Técnicos"
        subtitle="Desempenho e status dos inventários"
        actions={
          <button className="btn btn-primary" onClick={() => {}} disabled={exporting}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Excel
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#888888', fontSize: '0.85rem', fontWeight: '600' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
            {byTech.map((t) => (
              <div key={t.id} className="card card-hover" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#000000', color: '#ffffff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem', fontWeight: '800', flexShrink: 0,
                  }}>
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '800', color: '#000000', fontSize: '0.95rem', lineHeight: 1.2 }}>{t.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#666666', fontWeight: '600' }}>{t.region || '—'}</div>
                  </div>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.65rem', fontWeight: '800' }}
                    disabled={dbChecking === t.id}
                    onClick={() => checkDatabricks(t.id)}
                  >
                    {dbChecking === t.id ? '...' : 'DB'}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Metric label="Invs" value={t.invs.length} />
                  <Metric label="Feitos" value={t.completed} />
                  <Metric label="Diverg" value={t.totalDivergences} color={t.totalDivergences > 0 ? '#000000' : '#888888'} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#000000', marginBottom: '4px', fontWeight: '700' }}>
                    <span>Taxa de conclusão</span>
                    <span>{t.rate}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${t.rate}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', background: '#f9f9f9', borderBottom: '1px solid #eeeeee' }}>
              <div className="section-title" style={{ fontSize: '0.95rem' }}>Todos os Inventários</div>
            </div>
            <div className="table-wrapper" style={{ border: 'none' }}>
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
                  </tr>
                </thead>
                <tbody>
                  {inventories.map((inv) => {
                    const pct = inv.total_items > 0 ? Math.round((inv.counted_items / inv.total_items) * 100) : 0;
                    return (
                      <tr key={inv.id}>
                        <td style={{ fontWeight: '700', color: '#000000' }}>{inv.technicians?.name}</td>
                        <td style={{ fontWeight: '600' }}>{inv.technicians?.region || '—'}</td>
                        <td style={{ fontWeight: '600' }}>{inv.week_ref || '—'}</td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ width: '60px' }}>
                              <div className="progress-fill" style={{ width: `${pct}%` }} />
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ fontWeight: '800', color: inv.divergence_count > 0 ? '#000000' : '#888888' }}>
                          {inv.divergence_count}
                        </td>
                        <td style={{ fontSize: '0.75rem', fontWeight: '600' }}>{formatDuration(inv.started_at, inv.completed_at)}</td>
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
    <div style={{ textAlign: 'center', padding: '0.5rem', background: '#fcfcfc', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
      <div style={{ fontSize: '1.1rem', fontWeight: '900', color: color || '#000000', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.6rem', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700', marginTop: '2px' }}>{label}</div>
    </div>
  );
}
