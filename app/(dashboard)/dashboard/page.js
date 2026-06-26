'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/categorias');
  }, [router]);

  return null;
}
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
  completed:       '#000000',
  in_progress:     '#333333',
  abandoned:       '#666666',
  recount_pending: '#999999',
  pending:         '#cccccc',
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
    { name: 'Concluido',    value: kpis.completed || 0,       color: STATUS_COLORS.completed },
    { name: 'Em Andamento', value: kpis.in_progress || 0,     color: STATUS_COLORS.in_progress },
    { name: 'Abandonado',   value: kpis.abandoned || 0,       color: STATUS_COLORS.abandoned },
    { name: 'Recontagem',   value: kpis.recount_pending || 0, color: STATUS_COLORS.recount_pending },
    { name: 'Pendente',     value: kpis.pending || 0,         color: STATUS_COLORS.pending },
  ].filter((d) => d.value > 0);

  const completionRate = kpis.total > 0 ? Math.round((kpis.completed / kpis.total) * 100) : 0;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
        <PageHeader
          title="Dashboard"
          subtitle="Visão geral do inventário cíclico de técnicos"
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.7rem', color: '#888', fontWeight: '600' }}>
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
        <div style={{ textAlign: 'center', padding: '5rem', color: '#000000', fontWeight: '700' }}>Carregando dados...</div>
      ) : (
        <>
          {/* KPIs - Grid Fluido */}
          <div className="grid-fluid" style={{ marginBottom: '2rem' }}>
            <KpiCard label="Total Inventários" value={kpis.total || 0} sub="No período selecionado" />
            <KpiCard label="Concluídos" value={kpis.completed || 0} sub={`${completionRate}% de taxa de sucesso`} />
            <KpiCard label="Em Andamento" value={kpis.in_progress || 0} sub="Execução em tempo real" />
            <KpiCard label="Divergências" value={kpis.abandoned || 0} sub="Requerem atenção imediata" />
          </div>

          {/* Gráficos e Alertas - Grid Fluido */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="card">
              <div className="section-title" style={{ marginBottom: '1.5rem' }}>Distribuição de Status</div>
              <div style={{ height: '250px', width: '100%' }}>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid #000000', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888888', fontWeight: '600' }}>Sem dados para exibir</div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
                {pieData.map((d) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: '700', color: '#000000' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '2px', background: d.color }} />
                    {d.name.toUpperCase()}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="section-title" style={{ marginBottom: '1.5rem' }}>Alertas Críticos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {alerts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#888888', fontWeight: '600' }}>Nenhum alerta ativo</div>
                ) : (
                  alerts.map((a) => (
                    <div key={a.id} style={{ padding: '1rem', background: '#f9f9f9', border: '1px solid #eeeeee', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#000000' }}>{a.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#444444', marginTop: '2px', fontWeight: '500' }}>{a.description}</div>
                      <div style={{ fontSize: '0.65rem', color: '#888888', marginTop: '6px', fontWeight: '700' }}>{formatDate(a.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Tabela Recente - Full Width */}
          <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: '#f0f0f0', borderBottom: '1px solid #000000' }}>
              <div className="section-title">Atividade Recente</div>
            </div>
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>Região</th>
                    <th>Semana</th>
                    <th>Tipo</th>
                    <th>Status</th>
                    <th>Progresso</th>
                    <th>Divergências</th>
                    <th>Agendado</th>
                    <th>1ª Resposta</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '4rem', fontWeight: '700' }}>Nenhum inventário recente</td></tr>
                  ) : (
                    recent.map((inv) => {
                      const pct = inv.total_items > 0
                        ? Math.min(100, Math.round((inv.counted_items / inv.total_items) * 100))
                        : 0;
                      const sched       = inv.inventory_schedules?.[0];
                      const scheduledAt = sched?.scheduled_at;
                      const isPending   = inv.status === 'pending';
                      const isOverdue   = isPending && scheduledAt && new Date(scheduledAt) < new Date();
                      const isGeral     = sched?.inventory_type === 'general';
                      const subgrupo    = sched?.scheduled_subgroup;
                      return (
                        <tr key={inv.id}>
                          <td style={{ fontWeight: '800', color: '#000000' }}>{inv.technicians?.name}</td>
                          <td style={{ fontWeight: '600' }}>{inv.technicians?.region || '—'}</td>
                          <td style={{ fontWeight: '600' }}>{inv.week_ref || '—'}</td>
                          <td>
                            {isGeral
                              ? <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>GERAL</span>
                              : subgrupo
                                ? <span style={{ fontSize: '0.75rem', fontWeight: '700' }}>{subgrupo}</span>
                                : <span style={{ color: '#bbb', fontSize: '0.75rem' }}>—</span>
                            }
                          </td>
                          <td><StatusBadge status={inv.status} /></td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div className="progress-bar" style={{ width: '80px' }}>
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: '800' }}>{pct}%</span>
                            </div>
                          </td>
                          <td style={{ fontWeight: '900', color: (inv.divergence_quantity ?? inv.divergence_count) > 0 ? '#000000' : '#888888' }}>
                            {inv.divergence_quantity ?? inv.divergence_count}
                          </td>
                          <td>
                            {scheduledAt ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: isPending ? '800' : '600',
                                color: isOverdue ? '#000' : isPending ? '#333' : '#aaa',
                                background: isOverdue ? '#f0f0f0' : 'transparent',
                                padding: isOverdue ? '2px 6px' : '0',
                                borderRadius: '4px',
                                border: isOverdue ? '1px solid #ccc' : 'none',
                              }}>
                                {formatDateShort(scheduledAt)}
                              </span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '0.75rem' }}>—</span>
                            )}
                          </td>
                          <td>
                            {inv.started_at ? (
                              <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#000' }}>{formatDateShort(inv.started_at)}</span>
                            ) : (
                              <span style={{ fontSize: '0.7rem', fontWeight: '600', color: '#bbb' }}>Aguardando</span>
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

function KpiCard({ label, value, sub }) {
  return (
    <div className="card" style={{ border: '1px solid #000000', background: '#ffffff' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#333333', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#666666', fontWeight: '600', marginTop: '0.5rem' }}>{sub}</div>}
    </div>
  );
}
