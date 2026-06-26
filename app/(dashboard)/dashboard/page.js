'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

function formatDateShort(date) {
  if (!date) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(date));
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session?.user?.role === 'analista_custo') {
      router.replace('/ferramental/dashboard');
      return;
    }
  }, [session, router]);

  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (isInitial = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);

    const fetches = [fetch(`/api/dashboard?${params}`).then(r => r.json())];
    if (isInitial) fetches.push(fetch('/api/technicians').then(r => r.json()));

    const [json, techs] = await Promise.all(fetches);
    setData(json);
    if (techs) setTechnicians(techs);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(true); }, [load]);

  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const kpis = data?.kpis || {};
  const recent = data?.recent || [];
  const alerts = data?.alerts || [];

  const pieData = [
    { name: 'Concluído', value: kpis.completed || 0, color: '#00d4ff' },
    { name: 'Em Andamento', value: kpis.in_progress || 0, color: '#3b82f6' },
    { name: 'Abandonado', value: kpis.abandoned || 0, color: '#ef4444' },
    { name: 'Recontagem', value: kpis.recount_pending || 0, color: '#fca311' },
  ].filter(d => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{ padding: 'clamp(1.5rem, 5vw, 3rem)', width: '100%' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
          <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: '900', color: '#ffffff', margin: 0, letterSpacing: '-0.02em' }}>Dashboard</h1>
          <p style={{ fontSize: 'clamp(0.85rem, 2vw, 1rem)', color: '#a8a8a8', margin: '0.75rem 0 0 0' }}>Visão geral do inventário cíclico de técnicos</p>
        </div>

        <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />
        <div style={{ height: '1.5rem' }} />

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#ffffff' }}>Carregando...</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(220px, 22vw, 280px), 1fr))',
              gap: 'clamp(1rem, 2vw, 1.5rem)',
              marginBottom: 'clamp(2rem, 4vw, 3rem)',
            }}>
              <KpiCard label="Total" value={kpis.total || 0} highlight />
              <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}%`} highlight />
              <KpiCard label="Em Andamento" value={kpis.in_progress || 0} />
              <KpiCard label="Divergências" value={kpis.abandoned || 0} />
            </div>

            {/* Main Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(300px, 45vw, 500px), 1fr))',
              gap: 'clamp(1.5rem, 3vw, 2.5rem)',
              marginBottom: 'clamp(2rem, 4vw, 3rem)',
            }}>
              {/* Chart */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.7) 0%, rgba(20, 35, 70, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '16px',
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.1)',
              }}>
                <h3 style={{ color: '#00d4ff', fontSize: 'clamp(1rem, 2vw, 1.1rem)', fontWeight: '700', margin: '0 0 1.5rem 0' }}>📊 Status</h3>
                <div style={{ height: 'clamp(220px, 40vw, 280px)' }}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={3} dataKey="value">
                          {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{
                          background: 'rgba(20, 30, 60, 0.9)',
                          border: '1px solid rgba(0, 212, 255, 0.2)',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.8rem',
                        }} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a8a8a8' }}>Sem dados</div>}
                </div>
              </div>

              {/* Alerts */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.7) 0%, rgba(20, 35, 70, 0.5) 100%)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                borderRadius: '16px',
                padding: 'clamp(1.5rem, 3vw, 2rem)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.1)',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <h3 style={{ color: '#00d4ff', fontSize: 'clamp(1rem, 2vw, 1.1rem)', fontWeight: '700', margin: '0 0 1.5rem 0' }}>⚠️ Alertas</h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#a8a8a8', padding: '1.5rem 0' }}>Nenhum alerta</div>
                  ) : (
                    alerts.slice(0, 4).map((a, i) => (
                      <div key={i} style={{
                        padding: '0.85rem',
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '8px',
                      }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{a.title}</div>
                        <div style={{ fontSize: '0.7rem', color: '#a8a8a8', marginTop: '0.3rem' }}>{a.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 30, 60, 0.7) 0%, rgba(20, 35, 70, 0.5) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(0, 212, 255, 0.15)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 212, 255, 0.1)',
            }}>
              <div style={{
                padding: 'clamp(1.25rem, 3vw, 1.75rem)',
                background: 'rgba(0, 212, 255, 0.06)',
                borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
              }}>
                <h3 style={{ color: '#00d4ff', fontWeight: '700', fontSize: 'clamp(1rem, 2vw, 1.1rem)', margin: 0 }}>📋 Atividade Recente</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 212, 255, 0.04)' }}>
                      <th style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', textAlign: 'left', color: '#00d4ff', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>Técnico</th>
                      <th style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', textAlign: 'left', color: '#00d4ff', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>Região</th>
                      <th style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', textAlign: 'left', color: '#00d4ff', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>Status</th>
                      <th style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', textAlign: 'left', color: '#00d4ff', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>Progresso</th>
                      <th style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', textAlign: 'left', color: '#00d4ff', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(0, 212, 255, 0.1)' }}>Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#a8a8a8' }}>Nenhum inventário recente</td></tr>
                    ) : (
                      recent.slice(0, 8).map((inv, i) => {
                        const pct = inv.total_items > 0 ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100)) : 0;
                        return (
                          <tr key={i} style={{ borderBottom: '1px solid rgba(0, 212, 255, 0.05)', transition: 'all 0.2s ease' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                            <td style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', color: '#ffffff', fontWeight: '600' }}>{inv.technicians?.name}</td>
                            <td style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', color: '#a8a8a8' }}>{inv.technicians?.region || '—'}</td>
                            <td style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}><StatusBadge status={inv.status} /></td>
                            <td style={{ padding: 'clamp(0.75rem, 2vw, 1rem)' }}>
                              <div style={{ width: '80px', height: '5px', background: 'rgba(0, 212, 255, 0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #00d4ff, #0099cc)', transition: 'width 0.3s ease' }} />
                              </div>
                            </td>
                            <td style={{ padding: 'clamp(0.75rem, 2vw, 1rem)', color: '#a8a8a8', fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)' }}>
                              {inv.created_at ? new Date(inv.created_at).toLocaleDateString('pt-BR') : '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.15) 0%, rgba(0, 212, 255, 0.05) 100%)'
        : 'linear-gradient(135deg, rgba(0, 0, 0, 0.3) 0%, rgba(0, 0, 0, 0.1) 100%)',
      backdropFilter: 'blur(10px)',
      border: highlight ? '1.5px solid rgba(0, 212, 255, 0.3)' : '1px solid rgba(0, 212, 255, 0.12)',
      borderRadius: '12px',
      padding: 'clamp(1.25rem, 3vw, 1.75rem)',
      boxShadow: highlight
        ? '0 8px 32px rgba(0, 212, 255, 0.15), inset 0 1px 0 rgba(0, 212, 255, 0.1)'
        : '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(0, 212, 255, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 12px 48px rgba(0, 212, 255, 0.25), inset 0 1px 0 rgba(0, 212, 255, 0.15)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }
    }}
    onMouseLeave={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 212, 255, 0.15), inset 0 1px 0 rgba(0, 212, 255, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}>
      <div style={{ fontSize: 'clamp(0.7rem, 1.5vw, 0.8rem)', fontWeight: '700', color: '#a8a8a8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{label}</div>
      <div style={{ fontSize: 'clamp(2rem, 5vw, 2.5rem)', fontWeight: '900', color: highlight ? '#00d4ff' : '#ffffff', lineHeight: 1, marginBottom: '0.5rem' }}>{value}</div>
      {sub && <div style={{ fontSize: 'clamp(0.75rem, 1.5vw, 0.9rem)', color: '#a8a8a8' }}>{sub}</div>}
    </div>
  );
}
