'use client';

import { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDuration } from '@/lib/utils';

const STATUS_COLORS = {
  completed: '#404040',
  in_progress: '#737373',
  abandoned: '#171717',
  recount_pending: '#525252',
  pending: '#a3a3a3',
};

export default function DashboardPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    const res = await fetch(`/api/dashboard?${params}`);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const kpis = data?.kpis || {};
  const recent = data?.recent || [];
  const alerts = data?.alerts || [];
  const health = data?.health || [];

  const pieData = [
    { name: 'Concluído', value: kpis.completed || 0, color: STATUS_COLORS.completed },
    { name: 'Em Andamento', value: kpis.in_progress || 0, color: STATUS_COLORS.in_progress },
    { name: 'Abandonado', value: kpis.abandoned || 0, color: STATUS_COLORS.abandoned },
    { name: 'Recontagem', value: kpis.recount_pending || 0, color: STATUS_COLORS.recount_pending },
    { name: 'Pendente', value: kpis.pending || 0, color: STATUS_COLORS.pending },
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;



  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }}>
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do inventário cíclico de técnicos"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '1.25rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#a3a3a3' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <KpiCard label="Total" value={kpis.total || 0} color="#0a0a0a" sub="inventários no período" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} color="#0a0a0a" sub={`${completionRate}% de conclusão`} />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} color="#0a0a0a" sub="em execução agora" />
            <KpiCard label="Abandonados" value={kpis.abandoned || 0} color="#0a0a0a" sub="requerem atenção" />
            <KpiCard label="Recontagem" value={kpis.recount_pending || 0} color="#0a0a0a" sub="pendentes de revisão" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: '1rem' }}>Distribuição de Status</div>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', color: '#0a0a0a', fontSize: '0.8rem' }}
                      formatter={(v, n) => [v, n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#a3a3a3' }}>Sem dados</div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem' }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', fontSize: '0.75rem', color: '#737373' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                    {d.name} ({d.value})
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: '1rem' }}>Alertas Ativos</div>
              {alerts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#a3a3a3' }}>Nenhum alerta ativo</div>
              ) : (
                alerts.map((a) => (
                  <div
                    key={a.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      padding: '0.625rem',
                      background: '#fafafa',
                      border: '1px solid #e5e5e5',
                      borderRadius: '6px',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#262626', marginTop: '5px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '0.825rem', fontWeight: '600', color: '#0a0a0a' }}>{a.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#737373', marginTop: '2px' }}>{a.description}</div>
                      <div style={{ fontSize: '0.7rem', color: '#a3a3a3', marginTop: '2px' }}>{formatDate(a.created_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="section-title" style={{ marginBottom: '1rem' }}>Atividade Recente</div>
            {recent.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#a3a3a3' }}>Nenhum inventário encontrado</div>
            ) : (
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
                      <th>Início</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((inv) => {
                      const pct = inv.total_items > 0 ? Math.round((inv.counted_items / inv.total_items) * 100) : 0;
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: '500' }}>{inv.technicians?.name}</td>
                          <td style={{ color: '#737373' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ color: '#737373' }}>{inv.week_ref || '—'}</td>
                          <td><StatusBadge status={inv.status} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="progress-bar" style={{ width: '80px' }}>
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#737373' }}>{pct}%</span>
                            </div>
                          </td>
                          <td>
                            {inv.divergence_count > 0 ? (
                              <span style={{ color: '#262626', fontWeight: '600' }}>{inv.divergence_count}</span>
                            ) : (
                              <span style={{ color: '#a3a3a3' }}>0</span>
                            )}
                          </td>
                          <td style={{ color: '#737373', fontSize: '0.8rem' }}>{formatDate(inv.started_at || inv.created_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color }}>{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

