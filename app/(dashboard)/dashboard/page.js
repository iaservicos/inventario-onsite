'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

function IconTrendingUp() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 17"/><polyline points="17 6 23 6 23 12"/></svg>;
}

function IconUsers() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
}

function IconAlert() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
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

  const kpis = data?.kpis || {};
  const recent = data?.recent || [];
  const alerts = data?.alerts || [];

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  if (loading) {
    return <div style={{ padding: '2rem', color: 'var(--color-text-primary)' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '2rem', width: '100%', background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-text-primary)', margin: '0 0 0.5rem' }}>Dashboard</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', margin: 0 }}>Visão geral do inventário cíclico de técnicos</p>
      </div>

      {/* KPI Cards - Grande destaque */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        <KPICard
          icon={<IconTrendingUp />}
          label="Total Inventários"
          value={kpis.total || 0}
          sub="No período selecionado"
          color="#1dd1a1"
        />
        <KPICard
          icon={<IconUsers />}
          label="Concluídos"
          value={kpis.completed || 0}
          sub={`${completionRate}% de taxa de sucesso`}
          color="#3b82f6"
        />
        <KPICard
          icon={<IconAlert />}
          label="Em Andamento"
          value={kpis.in_progress || 0}
          sub="Execução em tempo real"
          color="#f59e0b"
        />
        <KPICard
          icon={<IconTrendingUp />}
          label="Divergências"
          value={kpis.abandoned || 0}
          sub="Requerem atenção imediata"
          color="#ef4444"
        />
      </div>

      {/* Seção Gráficos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Gráfico Pizza */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(29, 209, 161, 0.03) 100%)',
          border: '1.5px solid var(--color-border-light)',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(29, 209, 161, 0.05)',
        }}>
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '1.5rem', fontWeight: '700' }}>📊 Distribuição de Status</h3>
          <div style={{ height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={[
                  { name: 'Concluído', value: kpis.completed || 0, fill: '#1dd1a1' },
                  { name: 'Em Andamento', value: kpis.in_progress || 0, fill: '#3b82f6' },
                  { name: 'Abandonado', value: kpis.abandoned || 0, fill: '#ef4444' },
                  { name: 'Pendente', value: kpis.pending || 0, fill: '#f59e0b' },
                ]} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value">
                  {[
                    { fill: '#1dd1a1' },
                    { fill: '#3b82f6' },
                    { fill: '#ef4444' },
                    { fill: '#f59e0b' },
                  ].map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(29, 209, 161, 0.03) 100%)',
          border: '1.5px solid var(--color-border-light)',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(29, 209, 161, 0.05)',
        }}>
          <h3 style={{ color: 'var(--color-accent)', marginBottom: '1.5rem', fontWeight: '700' }}>⚠️ Alertas Críticos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '300px', overflowY: 'auto' }}>
            {alerts.length === 0 ? (
              <p style={{ color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '2rem' }}>Nenhum alerta</p>
            ) : (
              alerts.slice(0, 4).map((a, i) => (
                <div key={i} style={{
                  padding: '1rem',
                  background: 'rgba(239, 68, 68, 0.05)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                  borderRadius: '8px',
                }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{a.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '0.25rem' }}>{a.description}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Tabela Recente */}
      <div style={{
        background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(29, 209, 161, 0.03) 100%)',
        border: '1.5px solid var(--color-border-light)',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(29, 209, 161, 0.05)',
      }}>
        <div style={{ padding: '1.5rem', background: 'rgba(29, 209, 161, 0.05)', borderBottom: '1.5px solid var(--color-border-light)' }}>
          <h3 style={{ color: 'var(--color-accent)', margin: 0, fontWeight: '700' }}>📋 Atividade Recente</h3>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(29, 209, 161, 0.03)' }}>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1.5px solid var(--color-border-light)' }}>Técnico</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1.5px solid var(--color-border-light)' }}>Região</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1.5px solid var(--color-border-light)' }}>Status</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1.5px solid var(--color-border-light)' }}>Progresso</th>
                <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--color-accent)', fontWeight: '700', fontSize: '0.75rem', textTransform: 'uppercase', borderBottom: '1.5px solid var(--color-border-light)' }}>Data</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum registro</td>
                </tr>
              ) : (
                recent.slice(0, 10).map((inv, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'all 0.2s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(29, 209, 161, 0.03)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem', color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: '600' }}>{inv.technicians?.name}</td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>{inv.technicians?.region || '—'}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.35rem 0.75rem',
                        background: 'rgba(29, 209, 161, 0.1)',
                        color: 'var(--color-accent)',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                      }}>
                        {inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{
                        width: '80px',
                        height: '6px',
                        background: 'var(--color-border-light)',
                        borderRadius: '10px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${Math.round((inv.counted_items / inv.total_items) * 100) || 0}%`,
                          height: '100%',
                          background: 'linear-gradient(90deg, var(--color-accent), #10b981)',
                        }} />
                      </div>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
                      {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--color-bg-secondary) 0%, rgba(29, 209, 161, 0.03) 100%)',
      border: '1.5px solid var(--color-border-light)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(29, 209, 161, 0.05)',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      cursor: 'pointer',
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = color;
      e.currentTarget.style.boxShadow = `0 8px 32px rgba(0, 0, 0, 0.5), 0 0 30px ${color}33`;
      e.currentTarget.style.transform = 'translateY(-4px)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = 'var(--color-border-light)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(29, 209, 161, 0.05)';
      e.currentTarget.style.transform = 'translateY(0)';
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: `${color}15`,
          border: `2px solid ${color}`,
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
          flexShrink: 0,
        }}>
          {icon}
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
            {label}
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: '900', color: color, lineHeight: 1, marginBottom: '0.5rem' }}>
            {value}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
            {sub}
          </div>
        </div>
      </div>
    </div>
  );
}
