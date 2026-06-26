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

const STATUS_COLORS = {
  completed: '#26d0ce',
  in_progress: '#79c0ff',
  abandoned: '#f85149',
  recount_pending: '#d29922',
  pending: '#8b949e',
};

const CARD_STYLE = {
  background: '#1e2d40',
  border: '1.5px solid rgba(38, 208, 206, 0.3)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 0 30px rgba(38, 208, 206, 0.2), inset 0 1px 0 rgba(38, 208, 206, 0.1)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
    { name: 'Concluído', value: kpis.completed || 0, color: '#26d0ce' },
    { name: 'Em Andamento', value: kpis.in_progress || 0, color: '#79c0ff' },
    { name: 'Abandonado', value: kpis.abandoned || 0, color: '#f85149' },
    { name: 'Recontagem', value: kpis.recount_pending || 0, color: '#d29922' },
    { name: 'Pendente', value: kpis.pending || 0, color: '#8b949e' },
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{
      padding: '2rem',
      width: '100%',
      background: '#0f1419',
      minHeight: '100vh',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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
          {/* KPIs */}
          <div className="grid-fluid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            <KpiCard label="Total Inventários" value={kpis.total || 0} sub="No período selecionado" color="#26d0ce" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}% de taxa de sucesso`} color="#26d0ce" highlight />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} sub="Execução em tempo real" color="#79c0ff" />
            <KpiCard label="Divergências" value={kpis.abandoned || 0} sub="Requerem atenção imediata" color="#f85149" />
          </div>

          {/* Gráficos e Alertas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}>
            <div style={CARD_STYLE}>
              <h3 style={{ color: '#26d0ce', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>📊 Distribuição de Status</h3>
              <div style={{ height: '280px', width: '100%' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: '#1e2d40',
                          border: '1px solid rgba(38, 208, 206, 0.3)',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: '#ffffff',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b95a5', fontWeight: '600' }}>Sem dados para exibir</div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#e8eef7' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '2px', background: d.color }} />
                    {d.name.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            <div style={CARD_STYLE}>
              <h3 style={{ color: '#26d0ce', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>⚠️ Alertas Críticos</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#8b95a5', fontWeight: '600' }}>Nenhum alerta ativo</div>
                ) : (
                  alerts.slice(0, 5).map((a) => (
                    <div key={a.id} style={{
                      padding: '1rem',
                      background: 'rgba(248, 81, 73, 0.08)',
                      border: '1px solid rgba(248, 81, 73, 0.25)',
                      borderRadius: '8px',
                    }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#ffffff' }}>{a.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#8b95a5', marginTop: '2px', fontWeight: '500' }}>{a.description}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{
            ...CARD_STYLE,
            padding: 0,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'rgba(38, 208, 206, 0.08)',
              borderBottom: '1px solid rgba(38, 208, 206, 0.2)',
            }}>
              <h3 style={{ color: '#26d0ce', margin: 0, fontWeight: '700', fontSize: '1rem' }}>📋 Atividade Recente</h3>
            </div>
            <div className="table-wrapper" style={{ border: 'none', boxShadow: 'none', borderRadius: '0' }}>
              <table>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Técnico</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Região</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Semana</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Tipo</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Status</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Progresso</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Divergências</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>Agendado</th>
                    <th style={{ color: '#26d0ce', background: 'transparent' }}>1ª Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: '#8b95a5' }}>Nenhum inventário recente</td></tr>
                  ) : (
                    recent.map((inv) => {
                      const pct = inv.total_items > 0
                        ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100))
                        : 0;
                      const sched = inv.inventory_schedules?.[0];
                      const scheduledAt = sched?.scheduled_at;
                      const isPending = inv.status === 'pending';
                      const isOverdue = isPending && scheduledAt && new Date(scheduledAt) < new Date();
                      const isGeral = sched?.inventory_type === 'general';
                      const subgrupo = sched?.scheduled_subgroup;
                      return (
                        <tr key={inv.id} style={{
                          borderBottom: '1px solid rgba(38, 208, 206, 0.1)',
                          transition: 'all 0.2s ease',
                          backgroundColor: 'transparent',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(38, 208, 206, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                          <td style={{ fontWeight: '800', color: '#ffffff' }}>{inv.technicians?.name}</td>
                          <td style={{ fontWeight: '600', color: '#e8eef7' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ fontWeight: '600', color: '#e8eef7' }}>{inv.week_ref || '—'}</td>
                          <td>
                            {isGeral
                              ? <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>GERAL</span>
                              : subgrupo
                                ? <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#e8eef7' }}>{subgrupo}</span>
                                : <span style={{ color: '#8b95a5', fontSize: '0.75rem' }}>—</span>
                            }
                          </td>
                          <td><StatusBadge status={inv.status} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="progress-bar" style={{ width: '80px', background: 'rgba(38, 208, 206, 0.15)', borderRadius: '10px', height: '6px', overflow: 'hidden' }}>
                                <div className="progress-fill" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #26d0ce, #3ae6e4)', height: '100%' }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#26d0ce' }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: '900', color: (inv.divergence_quantity ?? inv.divergence_count) > 0 ? '#f85149' : '#8b95a5' }}>
                            {inv.divergence_quantity ?? inv.divergence_count}
                          </td>
                          <td>
                            {scheduledAt ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: isPending ? '800' : '600',
                                color: isOverdue ? '#f85149' : isPending ? '#e8eef7' : '#8b95a5',
                                background: isOverdue ? 'rgba(248, 81, 73, 0.08)' : 'transparent',
                                padding: isOverdue ? '2px 6px' : '0',
                                borderRadius: '4px',
                                border: isOverdue ? '1px solid rgba(248, 81, 73, 0.2)' : 'none',
                              }}>
                                {formatDateShort(scheduledAt)}
                              </span>
                            ) : (
                              <span style={{ color: '#8b95a5', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            {inv.started_at ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#ffffff' }}>{formatDateShort(inv.started_at)}</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#8b95a5' }}>Aguardando</span>
                            )}
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

function KpiCard({ label, value, sub, color, highlight }) {
  return (
    <div style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(38, 208, 206, 0.15) 0%, rgba(38, 208, 206, 0.05) 100%)'
        : '#1e2d40',
      border: highlight ? '1.5px solid #26d0ce' : '1.5px solid rgba(38, 208, 206, 0.25)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: highlight
        ? '0 0 30px rgba(38, 208, 206, 0.25), inset 0 1px 0 rgba(38, 208, 206, 0.1)'
        : '0 0 20px rgba(38, 208, 206, 0.1), inset 0 1px 0 rgba(38, 208, 206, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 0 40px rgba(38, 208, 206, 0.35), inset 0 1px 0 rgba(38, 208, 206, 0.15)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }
    }}
    onMouseLeave={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 0 30px rgba(38, 208, 206, 0.25), inset 0 1px 0 rgba(38, 208, 206, 0.1)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: color, lineHeight: 1, marginBottom: '0.5rem' }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#8b95a5', fontWeight: '600' }}>{sub}</div>}
    </div>
  );
}
