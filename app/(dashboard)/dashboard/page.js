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
    { name: 'Concluído', value: kpis.completed || 0, color: '#26d0ce' },
    { name: 'Em Andamento', value: kpis.in_progress || 0, color: '#3b82f6' },
    { name: 'Abandonado', value: kpis.abandoned || 0, color: '#ef4444' },
    { name: 'Recontagem', value: kpis.recount_pending || 0, color: '#fbbf24' },
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{
      padding: '2rem',
      width: '100%',
      background: '#0f1419',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral do inventário cíclico de técnicos"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.7rem', color: '#8b95a5', fontWeight: '600' }}>
              Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
          <button
            className="btn"
            style={{ fontSize: '0.7rem', padding: '0.35rem 0.75rem' }}
            onClick={load}
            disabled={loading}
          >
            {loading ? '...' : 'Atualizar'}
          </button>
        </div>
      </div>

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '2rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#ffffff', fontWeight: '700' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs - 4 colunas com borda turquesa sutil */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.25rem',
            marginBottom: '2.5rem',
          }}>
            <KpiCard label="Total Inventários" value={kpis.total || 0} sub="No período" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}%`} highlight />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} sub="Ativo" />
            <KpiCard label="Divergências" value={kpis.abandoned || 0} sub="Atenção" />
          </div>

          {/* Gráfico + Alertas em 2 colunas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            {/* Gráfico */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(38, 208, 206, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 0 30px rgba(38, 208, 206, 0.2)',
            }}>
              <h3 style={{ color: '#26d0ce', marginBottom: '1.5rem', fontWeight: '700', fontSize: '0.95rem' }}>Distribuição de Status</h3>
              <div style={{ height: '240px', width: '100%' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(30, 45, 64, 0.9)',
                          border: '1px solid rgba(38, 208, 206, 0.3)',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          color: '#ffffff',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b95a5' }}>Sem dados</div>
                )}
              </div>
            </div>

            {/* Alertas */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(38, 208, 206, 0.3)',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 0 30px rgba(38, 208, 206, 0.2)',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <h3 style={{ color: '#26d0ce', marginBottom: '1.25rem', fontWeight: '700', fontSize: '0.95rem' }}>Alertas Críticos</h3>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#8b95a5', fontWeight: '600' }}>Nenhum alerta</div>
                ) : (
                  alerts.slice(0, 4).map((a) => (
                    <div key={a.id} style={{
                      padding: '0.85rem',
                      background: 'rgba(38, 208, 206, 0.08)',
                      border: '1px solid rgba(38, 208, 206, 0.2)',
                      borderRadius: '6px',
                    }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: '700', color: '#ffffff' }}>{a.title}</div>
                      <div style={{ fontSize: '0.7rem', color: '#8b95a5', marginTop: '3px' }}>{a.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(38, 208, 206, 0.3)',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 0 30px rgba(38, 208, 206, 0.2)',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(38, 208, 206, 0.05)',
              borderBottom: '1px solid rgba(38, 208, 206, 0.15)',
            }}>
              <h3 style={{ color: '#26d0ce', margin: 0, fontWeight: '700', fontSize: '0.95rem' }}>Atividade Recente</h3>
            </div>
            <div style={{ overflow: 'x', overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Técnico</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Região</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Semana</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Status</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Progresso</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Divergências</th>
                    <th style={{ color: '#26d0ce', padding: '0.85rem 1rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#8b95a5', fontWeight: '700' }}>Nenhum inventário recente</td></tr>
                  ) : (
                    recent.slice(0, 8).map((inv) => {
                      const pct = inv.total_items > 0 ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100)) : 0;
                      return (
                        <tr key={inv.id} style={{
                          borderBottom: '1px solid rgba(38, 208, 206, 0.08)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(38, 208, 206, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.75rem 1rem', color: '#ffffff', fontWeight: '700' }}>{inv.technicians?.name}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#e8eef7' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem', color: '#e8eef7' }}>{inv.week_ref || '—'}</td>
                          <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ width: '70px', height: '3px', background: 'rgba(38, 208, 206, 0.12)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#26d0ce', boxShadow: '0 0 8px rgba(38, 208, 206, 0.4)' }} />
                            </div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: (inv.divergence_quantity ?? 0) > 0 ? '#26d0ce' : '#8b95a5', fontWeight: '800' }}>
                            {inv.divergence_quantity ?? 0}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: '#8b95a5', fontSize: '0.7rem' }}>
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

function KpiCard({ label, value, sub, highlight }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
      backdropFilter: 'blur(20px)',
      border: highlight ? '1px solid rgba(38, 208, 206, 0.5)' : '1px solid rgba(38, 208, 206, 0.3)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: highlight ? '0 0 25px rgba(38, 208, 206, 0.3)' : '0 0 20px rgba(38, 208, 206, 0.18)',
      transition: 'all 0.25s ease',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = highlight ? '0 0 35px rgba(38, 208, 206, 0.4)' : '0 0 30px rgba(38, 208, 206, 0.28)';
      e.currentTarget.style.transform = 'translateY(-2px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = highlight ? '0 0 25px rgba(38, 208, 206, 0.3)' : '0 0 20px rgba(38, 208, 206, 0.18)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: '900', color: highlight ? '#26d0ce' : '#ffffff', lineHeight: 1, marginBottom: '0.5rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: '#8b95a5', fontWeight: '600' }}>{sub}</div>}
    </div>
  );
}
