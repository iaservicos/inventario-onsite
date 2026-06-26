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

const CARD_STYLE = {
  background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
  backdropFilter: 'blur(20px)',
  border: '1.5px solid rgba(38, 208, 206, 0.4)',
  borderRadius: '12px',
  overflow: 'hidden',
  boxShadow: '0 0 50px rgba(38, 208, 206, 0.35), inset 0 0 30px rgba(38, 208, 206, 0.08)',
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  position: 'relative',
};

// SVG Pattern Background
const PatternSVG = () => (
  <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.03 }}>
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(38, 208, 206, 0.5)" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

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
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{
      padding: '2rem',
      width: '100%',
      background: '#0f1419',
      minHeight: '100vh',
      position: 'relative',
    }}>
      <PatternSVG />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
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
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
            position: 'relative',
            zIndex: 1,
          }}>
            <KpiCard label="Total Inventários" value={kpis.total || 0} sub="No período" color="#26d0ce" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}% sucesso`} color="#26d0ce" highlight />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} sub="Execução ativa" color="#79c0ff" />
            <KpiCard label="Divergências" value={kpis.abandoned || 0} sub="Atenção" color="#f85149" />
          </div>

          {/* Gráficos e Alertas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Gráfico */}
            <div style={{...CARD_STYLE, padding: '1.5rem'}}>
              <PatternSVG />
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  height: '3px',
                  background: 'linear-gradient(90deg, #26d0ce, transparent)',
                  marginBottom: '1rem',
                  borderRadius: '2px',
                }} />
                <h3 style={{ color: '#26d0ce', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>
                  Distribuição de Status
                </h3>
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
                            background: 'rgba(30, 45, 64, 0.95)',
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
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b95a5' }}>Sem dados</div>
                  )}
                </div>
              </div>
            </div>

            {/* Alertas */}
            <div style={{...CARD_STYLE, padding: '1.5rem', display: 'flex', flexDirection: 'column'}}>
              <PatternSVG />
              <div style={{ position: 'relative', zIndex: 2, flex: 1 }}>
                <div style={{
                  height: '3px',
                  background: 'linear-gradient(90deg, #26d0ce, transparent)',
                  marginBottom: '1rem',
                  borderRadius: '2px',
                }} />
                <h3 style={{ color: '#26d0ce', marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>
                  Alertas Críticos
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#8b95a5', fontWeight: '600' }}>Nenhum alerta</div>
                  ) : (
                    alerts.slice(0, 4).map((a) => (
                      <div key={a.id} style={{
                        padding: '0.85rem',
                        background: 'rgba(38, 208, 206, 0.12)',
                        border: '1px solid rgba(38, 208, 206, 0.25)',
                        borderRadius: '8px',
                        borderLeft: '3px solid #26d0ce',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(38, 208, 206, 0.18)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(38, 208, 206, 0.12)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#26d0ce' }}>{a.title}</div>
                        <div style={{ fontSize: '0.75rem', color: '#8b95a5', marginTop: '2px' }}>{a.description}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{...CARD_STYLE, padding: 0, position: 'relative', zIndex: 1}}>
            <PatternSVG />
            <div style={{
              padding: '1.25rem 1.5rem',
              background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.15) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(38, 208, 206, 0.2)',
              position: 'relative',
              zIndex: 2,
            }}>
              <div style={{
                height: '3px',
                background: 'linear-gradient(90deg, #26d0ce, transparent)',
                marginBottom: '0.75rem',
                borderRadius: '2px',
              }} />
              <h3 style={{ color: '#26d0ce', margin: 0, fontWeight: '700', fontSize: '1rem' }}>
                Atividade Recente
              </h3>
            </div>
            <div style={{ overflow: 'x', overflowX: 'auto', position: 'relative', zIndex: 2 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Técnico</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Região</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Semana</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Tipo</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Status</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Progresso</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Divergências</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.75rem', borderBottom: '1px solid rgba(38, 208, 206, 0.1)' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#8b95a5', fontWeight: '700' }}>Nenhum inventário recente</td></tr>
                  ) : (
                    recent.slice(0, 8).map((inv) => {
                      const pct = inv.total_items > 0 ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100)) : 0;
                      return (
                        <tr key={inv.id} style={{
                          borderBottom: '1px solid rgba(38, 208, 206, 0.08)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(38, 208, 206, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '0.85rem 1.5rem', color: '#ffffff', fontWeight: '700' }}>{inv.technicians?.name}</td>
                          <td style={{ padding: '0.85rem 1.5rem', color: '#e8eef7' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ padding: '0.85rem 1.5rem', color: '#e8eef7' }}>{inv.week_ref || '—'}</td>
                          <td style={{ padding: '0.85rem 1.5rem', color: '#8b95a5', fontSize: '0.75rem' }}>—</td>
                          <td style={{ padding: '0.85rem 1.5rem' }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: '0.85rem 1.5rem' }}>
                            <div style={{ width: '80px', height: '5px', background: 'rgba(38, 208, 206, 0.15)', borderRadius: '10px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, #26d0ce, #3ae6e4)', boxShadow: '0 0 10px rgba(38, 208, 206, 0.5)' }} />
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1.5rem', color: (inv.divergence_quantity ?? 0) > 0 ? '#26d0ce' : '#8b95a5', fontWeight: '800' }}>
                            {inv.divergence_quantity ?? 0}
                          </td>
                          <td style={{ padding: '0.85rem 1.5rem', color: '#8b95a5', fontSize: '0.75rem' }}>
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

function KpiCard({ icon, label, value, sub, color, highlight }) {
  return (
    <div style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(38, 208, 206, 0.2) 0%, rgba(38, 208, 206, 0.05) 100%)'
        : 'linear-gradient(135deg, rgba(30, 45, 64, 0.8) 0%, rgba(42, 56, 80, 0.6) 100%)',
      backdropFilter: 'blur(20px)',
      border: highlight ? '1.5px solid #26d0ce' : '1.5px solid rgba(38, 208, 206, 0.3)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: highlight
        ? '0 0 60px rgba(38, 208, 206, 0.4), inset 0 0 20px rgba(38, 208, 206, 0.15)'
        : '0 0 40px rgba(38, 208, 206, 0.25), inset 0 0 15px rgba(38, 208, 206, 0.08)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 0 80px rgba(38, 208, 206, 0.5), inset 0 0 20px rgba(38, 208, 206, 0.2)';
        e.currentTarget.style.transform = 'translateY(-6px)';
      } else {
        e.currentTarget.style.boxShadow = '0 0 60px rgba(38, 208, 206, 0.35), inset 0 0 20px rgba(38, 208, 206, 0.12)';
        e.currentTarget.style.transform = 'translateY(-3px)';
      }
    }}
    onMouseLeave={(e) => {
      if (highlight) {
        e.currentTarget.style.boxShadow = '0 0 60px rgba(38, 208, 206, 0.4), inset 0 0 20px rgba(38, 208, 206, 0.15)';
        e.currentTarget.style.transform = 'translateY(0)';
      } else {
        e.currentTarget.style.boxShadow = '0 0 40px rgba(38, 208, 206, 0.25), inset 0 0 15px rgba(38, 208, 206, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
      }
    }}>
      <PatternSVG />
      <div style={{ position: 'relative', zIndex: 2 }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{icon}</div>
        <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#8b95a5', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{label}</div>
        <div style={{ fontSize: '2.5rem', fontWeight: '900', color: color, lineHeight: 1, marginBottom: '0.5rem' }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#8b95a5', fontWeight: '600' }}>{sub}</div>}
      </div>
    </div>
  );
}
