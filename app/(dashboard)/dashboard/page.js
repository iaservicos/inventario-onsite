'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
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

const STATUS_COLORS = {
  completed: 'var(--color-accent)',
  in_progress: 'var(--color-info)',
  abandoned: 'var(--color-error)',
  recount_pending: 'var(--color-warning)',
  pending: 'var(--color-text-tertiary)',
};

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
  const [lastUpdated, setLastUpdated] = useState(null);

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
    setLastUpdated(new Date());
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
    { name: 'Concluído', value: kpis.completed || 0, color: STATUS_COLORS.completed },
    { name: 'Em Andamento', value: kpis.in_progress || 0, color: STATUS_COLORS.in_progress },
    { name: 'Abandonado', value: kpis.abandoned || 0, color: STATUS_COLORS.abandoned },
    { name: 'Recontagem', value: kpis.recount_pending || 0, color: STATUS_COLORS.recount_pending },
    { name: 'Pendente', value: kpis.pending || 0, color: STATUS_COLORS.pending },
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{
      padding: 'clamp(1.5rem, 5vw, 3rem)',
      width: '100%',
      maxWidth: '1600px',
      margin: '0 auto',
    }}>
      {/* Header Limpo - Responsivo */}
      <div style={{ marginBottom: 'clamp(2rem, 5vw, 3rem)' }}>
        <h1 style={{
          fontSize: 'clamp(1.8rem, 5vw, 2.5rem)',
          fontWeight: '900',
          color: 'var(--color-text-primary)',
          margin: 0,
          letterSpacing: '-0.02em',
        }}>Dashboard</h1>
        <p style={{
          fontSize: 'clamp(0.8rem, 2vw, 0.95rem)',
          color: 'var(--color-text-tertiary)',
          margin: '0.5rem 0 0 0',
        }}>Visão geral do inventário cíclico</p>
      </div>

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '2rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-primary)', fontWeight: '700' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs - Grid Responsivo */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(clamp(200px, 25vw, 280px), 1fr))',
            gap: 'clamp(1rem, 2vw, 1.5rem)',
            marginBottom: '3rem',
          }}>
            <KpiCard label="Total" value={kpis.total || 0} sub="Inventários" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}% concluído`} accent />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} sub="Execução ativa" />
            <KpiCard label="Divergências" value={kpis.abandoned || 0} sub="Requerem atenção" />
          </div>

          {/* Seção Principal - Responsiva */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
            gap: 'clamp(1.5rem, 3vw, 2rem)',
            marginBottom: '2rem',
          }}>
            {/* Gráfico Pizza */}
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '12px',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            }}>
              <h3 style={{
                color: 'var(--color-accent)',
                marginBottom: '1.5rem',
                fontWeight: '700',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              }}>Distribuição de Status</h3>
              <div style={{ height: 'clamp(200px, 50vw, 280px)' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-default)', borderRadius: '6px', fontSize: '0.75rem' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)' }}>Sem dados</div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', justifyContent: 'center' }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }} />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Alertas */}
            <div style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '12px',
              padding: 'clamp(1.5rem, 3vw, 2rem)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h3 style={{
                color: 'var(--color-accent)',
                marginBottom: '1.5rem',
                fontWeight: '700',
                fontSize: 'clamp(0.9rem, 2vw, 1rem)',
              }}>Alertas Críticos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, overflowY: 'auto', maxHeight: '320px' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.9rem', padding: '2rem 0' }}>Nenhum alerta ativo</div>
                ) : (
                  alerts.slice(0, 5).map((a) => (
                    <div key={a.id} style={{
                      padding: '0.85rem',
                      background: 'rgba(255, 68, 68, 0.05)',
                      border: '1px solid rgba(255, 68, 68, 0.2)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{a.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginTop: '0.3rem' }}>{a.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabela - Full Width */}
          <div style={{
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border-light)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          }}>
            <div style={{ padding: '1.5rem 2rem', background: 'rgba(0, 212, 255, 0.05)', borderBottom: '1px solid var(--color-border-light)' }}>
              <h3 style={{ color: 'var(--color-accent)', margin: 0, fontWeight: '700', fontSize: '1rem' }}>Atividade Recente</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Técnico</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Região</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Semana</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Status</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Progresso</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Divergências</th>
                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum inventário recente</td>
                    </tr>
                  ) : (
                    recent.slice(0, 8).map((inv) => {
                      const pct = inv.total_items > 0 ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100)) : 0;
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'all 0.2s ease' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 212, 255, 0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-primary)', fontWeight: '600' }}>{inv.technicians?.name}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)' }}>{inv.week_ref || '—'}</td>
                          <td style={{ padding: '1rem 1.5rem' }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ width: '80px', height: '5px', background: 'var(--color-border-default)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--color-accent), #00b8d4)', transition: 'width 0.3s ease' }} />
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: (inv.divergence_quantity ?? inv.divergence_count) > 0 ? 'var(--color-error)' : 'var(--color-text-tertiary)', fontWeight: '600' }}>
                            {inv.divergence_quantity ?? inv.divergence_count}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>
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
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: accent ? 'linear-gradient(135deg, rgba(0, 212, 255, 0.1) 0%, rgba(0, 212, 255, 0.02) 100%)' : 'var(--color-bg-secondary)',
      border: accent ? '1.5px solid var(--color-accent)' : '1px solid var(--color-border-light)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: accent ? '0 0 20px rgba(0, 212, 255, 0.2)' : '0 4px 20px rgba(0, 0, 0, 0.2)',
      transition: 'all 0.3s ease',
    }}
    onMouseEnter={(e) => {
      if (accent) {
        e.currentTarget.style.boxShadow = '0 0 30px rgba(0, 212, 255, 0.35)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    }}
    onMouseLeave={(e) => {
      if (accent) {
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: '900', color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)', lineHeight: 1, marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)' }}>
        {sub}
      </div>
    </div>
  );
}
