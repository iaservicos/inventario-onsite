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
      background: 'linear-gradient(135deg, #0f1419 0%, #0a1628 50%, #0d1825 100%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Tech - Imagem Brasil Positivo */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          backgroundImage: 'url(https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Captura%20de%20tela%202026-06-26%20171836.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
        {/* Overlay escuro para melhorar legibilidade */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `
              linear-gradient(135deg, rgba(15, 20, 25, 0.75) 0%, rgba(10, 22, 40, 0.7) 50%, rgba(13, 24, 37, 0.75) 100%)
            `,
            pointerEvents: 'none',
          }}
        />

        {/* Glow dinâmico subtil */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: `
              radial-gradient(circle at 20% 20%, rgba(38, 208, 206, 0.15) 0%, transparent 45%),
              radial-gradient(circle at 80% 80%, rgba(38, 208, 206, 0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
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

      <div style={{ position: 'relative', zIndex: 1 }}>
        <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />
      </div>

      <div style={{ height: '2rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#ffffff', fontWeight: '700' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs - Cards Premium */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '1.5rem',
            marginBottom: '3rem',
            position: 'relative',
            zIndex: 1,
          }}>
            <PremiumKpiCard
              label="Total Inventários"
              value={kpis.total || 0}
              sub="No período"
              color="#26d0ce"
            />
            <PremiumKpiCard
              label="Concluídos"
              value={kpis.completed || 0}
              sub={`${completionRate}%`}
              color="#26d0ce"
              highlight
            />
            <PremiumKpiCard
              label="Em Andamento"
              value={kpis.in_progress || 0}
              sub="Ativo"
              color="#3b82f6"
            />
            <PremiumKpiCard
              label="Divergências"
              value={kpis.abandoned || 0}
              sub="Atenção"
              color="#ef4444"
            />
          </div>

          {/* Seção Principal - Gráfico + Alertas */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.2fr 1fr',
            gap: '1.5rem',
            marginBottom: '2.5rem',
            position: 'relative',
            zIndex: 1,
          }}>
            {/* Card Gráfico */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.9) 0%, rgba(42, 56, 80, 0.7) 100%)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(38, 208, 206, 0.4)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45), 0 0 50px rgba(38, 208, 206, 0.25)',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  marginBottom: '2rem',
                }}>
                  <h3 style={{ color: '#26d0ce', fontWeight: '700', fontSize: '1.1rem', margin: 0 }}>
                    Distribuição de Status
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#8b95a5' }}>Resumo por categoria</span>
                </div>

                <div style={{ height: '300px', width: '100%', marginBottom: '1.5rem' }}>
                  {pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            background: 'rgba(15, 20, 25, 0.98)',
                            border: '1.5px solid rgba(38, 208, 206, 0.5)',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#ffffff',
                            fontWeight: '700',
                            padding: '0.75rem',
                          }}
                          cursor={{ fill: 'rgba(38, 208, 206, 0.1)' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b95a5' }}>Sem dados</div>
                  )}
                </div>

                {/* Legend */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '0.85rem',
                  padding: '1.5rem 0 0 0',
                  borderTop: '1px solid rgba(38, 208, 206, 0.15)',
                }}>
                  {pieData.map((item) => (
                    <div key={item.name} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.65rem 0.75rem',
                      background: 'rgba(38, 208, 206, 0.06)',
                      border: '1px solid rgba(38, 208, 206, 0.2)',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(38, 208, 206, 0.12)';
                      e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(38, 208, 206, 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.2)';
                    }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        background: item.color,
                        borderRadius: '3px',
                        boxShadow: `0 0 8px ${item.color}60`
                      }} />
                      <span style={{ fontSize: '0.8rem', color: '#ffffff', fontWeight: '700' }}>{item.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card Alertas */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.9) 0%, rgba(42, 56, 80, 0.7) 100%)',
              backdropFilter: 'blur(40px)',
              border: '1px solid rgba(38, 208, 206, 0.4)',
              borderRadius: '20px',
              padding: '2.5rem',
              boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45), 0 0 50px rgba(38, 208, 206, 0.25)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ position: 'relative', zIndex: 1, flex: 1 }}>
                <h3 style={{ color: '#26d0ce', fontWeight: '700', fontSize: '1.1rem', margin: '0 0 1.5rem 0' }}>
                  Alertas Críticos
                </h3>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {alerts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#8b95a5', fontWeight: '600' }}>
                      Nenhum alerta crítico
                    </div>
                  ) : (
                    alerts.slice(0, 4).map((a) => (
                      <div key={a.id} style={{
                        padding: '1rem',
                        background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.12) 0%, transparent 100%)',
                        border: '1px solid rgba(38, 208, 206, 0.25)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.18) 0%, transparent 100%)';
                        e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.4)';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.12) 0%, transparent 100%)';
                        e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.25)';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#26d0ce', marginBottom: '0.5rem' }}>
                          {a.title}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#8b95a5', lineHeight: '1.4' }}>
                          {a.description}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tabela */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.9) 0%, rgba(42, 56, 80, 0.7) 100%)',
            backdropFilter: 'blur(40px)',
            border: '1px solid rgba(38, 208, 206, 0.4)',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0 25px 70px rgba(0, 0, 0, 0.45), 0 0 50px rgba(38, 208, 206, 0.25)',
            position: 'relative',
            zIndex: 1,
          }}>
            <div style={{
              padding: '1.5rem 2rem',
              background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.08) 0%, transparent 100%)',
              borderBottom: '1px solid rgba(38, 208, 206, 0.15)',
              position: 'relative',
              zIndex: 1,
            }}>
              <h3 style={{ color: '#26d0ce', fontWeight: '700', fontSize: '1.1rem', margin: 0 }}>
                Atividade Recente
              </h3>
            </div>
            <div style={{ overflow: 'x', overflowX: 'auto', position: 'relative', zIndex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'transparent' }}>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Técnico</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Região</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Semana</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Status</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Progresso</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Divergências</th>
                    <th style={{ color: '#26d0ce', padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.7rem', borderBottom: '1px solid rgba(38, 208, 206, 0.15)', letterSpacing: '0.05em' }}>Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: '#8b95a5', fontWeight: '700' }}>Nenhum inventário recente</td></tr>
                  ) : (
                    recent.slice(0, 8).map((inv) => {
                      const pct = inv.total_items > 0 ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100)) : 0;
                      return (
                        <tr key={inv.id} style={{
                          borderBottom: '1px solid rgba(38, 208, 206, 0.1)',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(38, 208, 206, 0.08)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                          <td style={{ padding: '1rem 1.5rem', color: '#ffffff', fontWeight: '700', fontSize: '0.9rem' }}>{inv.technicians?.name}</td>
                          <td style={{ padding: '1rem 1.5rem', color: '#e8eef7', fontSize: '0.9rem' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ padding: '1rem 1.5rem', color: '#e8eef7', fontSize: '0.9rem' }}>{inv.week_ref || '—'}</td>
                          <td style={{ padding: '1rem 1.5rem' }}><StatusBadge status={inv.status} /></td>
                          <td style={{ padding: '1rem 1.5rem' }}>
                            <div style={{ width: '70px', height: '3px', background: 'rgba(38, 208, 206, 0.12)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: '#26d0ce', boxShadow: '0 0 10px rgba(38, 208, 206, 0.5)' }} />
                            </div>
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: (inv.divergence_quantity ?? 0) > 0 ? '#26d0ce' : '#8b95a5', fontWeight: '800', fontSize: '0.9rem' }}>
                            {inv.divergence_quantity ?? 0}
                          </td>
                          <td style={{ padding: '1rem 1.5rem', color: '#8b95a5', fontSize: '0.85rem' }}>
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

function PremiumKpiCard({ label, value, sub, color, highlight }) {
  return (
    <div style={{
      background: highlight
        ? 'linear-gradient(135deg, rgba(38, 208, 206, 0.18) 0%, rgba(38, 208, 206, 0.08) 100%)'
        : 'linear-gradient(135deg, rgba(30, 45, 64, 0.9) 0%, rgba(42, 56, 80, 0.7) 100%)',
      backdropFilter: 'blur(40px)',
      border: highlight ? '1.5px solid rgba(38, 208, 206, 0.6)' : '1px solid rgba(38, 208, 206, 0.4)',
      borderRadius: '16px',
      padding: '1.5rem',
      boxShadow: highlight
        ? '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(38, 208, 206, 0.3)'
        : '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 25px rgba(38, 208, 206, 0.15)',
      transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
      cursor: 'pointer',
      position: 'relative',
      overflow: 'hidden',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = highlight
        ? '0 30px 70px rgba(0, 0, 0, 0.45), 0 0 50px rgba(38, 208, 206, 0.4)'
        : '0 30px 70px rgba(0, 0, 0, 0.45), 0 0 35px rgba(38, 208, 206, 0.25)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = highlight
        ? '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 40px rgba(38, 208, 206, 0.3)'
        : '0 20px 50px rgba(0, 0, 0, 0.4), 0 0 25px rgba(38, 208, 206, 0.15)';
    }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '0.7rem',
          fontWeight: '800',
          color: '#a0aab5',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: '0.75rem',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '2.5rem',
          fontWeight: '950',
          color: highlight ? color : '#ffffff',
          lineHeight: 1,
          marginBottom: '0.3rem',
          textShadow: highlight ? `0 0 20px ${color}40` : 'none',
        }}>
          {value}
        </div>
        {sub && (
          <div style={{
            fontSize: '0.8rem',
            color: '#a0aab5',
            fontWeight: '600',
            letterSpacing: '0.02em',
          }}>
            {sub}
          </div>
        )}
      </div>
      {highlight && (
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          right: '-20px',
          width: '120px',
          height: '120px',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)`,
          borderRadius: '50%',
          zIndex: 0,
          filter: 'blur(20px)',
        }} />
      )}
    </div>
  );
}
