'use client';

import { useState, useEffect, useCallback, useMemo, Fragment } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate, formatDuration } from '@/lib/utils';
export default function TecnicosPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '', supervisor: '' });
  const [technicians, setTechnicians] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const supervisors = useMemo(() =>
    [...new Set(technicians.filter(t => t.supervisor_name).map(t => t.supervisor_name))].sort(),
    [technicians]
  );

  const load = useCallback(async (isInitial = false) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.status) params.set('status', filters.status);
    if (filters.technicianId) {
      params.set('technicianId', filters.technicianId);
    } else if (filters.supervisor) {
      const ids = technicians.filter(t => t.supervisor_name === filters.supervisor).map(t => t.id);
      if (ids.length > 0) params.set('technicianIds', ids.join(','));
    }

    const fetches = [fetch(`/api/inventories?${params}`).then(r => r.json())];
    if (isInitial) fetches.push(fetch('/api/technicians').then(r => r.json()));

    const [invs, techs] = await Promise.all(fetches);
    setInventories(invs);
    if (techs) setTechnicians(techs);
    setLoading(false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(true); }, [load]);

  const techsVisible = filters.supervisor
    ? technicians.filter(t => t.supervisor_name === filters.supervisor)
    : technicians;

  const byTech = techsVisible.map((t) => {
    const invs = inventories.filter((i) => i.technician_id === t.id);
    const corretos     = invs.filter((i) => i.status === 'completed' && (i.divergence_count || 0) === 0).length;
    const comDiv       = invs.filter((i) => (i.divergence_count || 0) > 0).length;
    const recontagens  = comDiv;
    const totalDiv     = invs.reduce((s, i) => s + (i.divergence_count || 0), 0);
    const rate         = invs.length > 0 ? Math.round((corretos / invs.length) * 100) : 0;
    return { ...t, invs, corretos, comDiv, recontagens, totalDiv, rate };
  }).filter((t) => t.invs.length > 0 || !filters.technicianId);

  const totalTecnicos  = byTech.length;
  const totalInvs      = byTech.reduce((s, t) => s + t.invs.length, 0);
  const totalCorretos  = byTech.reduce((s, t) => s + t.corretos, 0);
  const taxaMedia      = totalInvs > 0 ? Math.round((totalCorretos / totalInvs) * 100) : 0;
  const totalDivGlobal = byTech.reduce((s, t) => s + t.totalDiv, 0);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Técnicos"
        subtitle="Desempenho e histórico de inventários"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <KpiCard label="Técnicos ativos" value={totalTecnicos} />
            <KpiCard label="Inventários" value={totalInvs} />
            <KpiCard label="Sem divergência" value={totalCorretos} highlight />
            <KpiCard label="Taxa de acerto" value={`${taxaMedia}%`} highlight={taxaMedia >= 80} />
            <KpiCard label="Total divergências" value={totalDivGlobal} alert={totalDivGlobal > 0} />
          </div>

          {/* Tabela de técnicos */}
          <div className="card" style={{ padding: 0, marginBottom: '2rem' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '2px solid #000', background: '#f9f9f9', borderRadius: '8px 8px 0 0' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Desempenho por Técnico
              </span>
            </div>
            <div style={{ overflowX: 'auto', width: '100%' }}>
              <table style={{ minWidth: '780px' }}>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>UF</th>
                    <th style={{ textAlign: 'center' }}>Inventários</th>
                    <th style={{ textAlign: 'center' }}>✓ Corretos</th>
                    <th style={{ textAlign: 'center' }}>⚠ C/ Divergência</th>
                    <th style={{ textAlign: 'center' }}>↺ Recontagens</th>
                    <th style={{ textAlign: 'center' }}>Itens Diverg.</th>
                    <th style={{ textAlign: 'center', minWidth: '140px' }}>Taxa de Acerto</th>
                  </tr>
                </thead>
                <tbody>
                  {byTech.length === 0 ? (
                    <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Nenhum dado no período</td></tr>
                  ) : byTech.map((t) => (
                    <Fragment key={t.id}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpanded(expanded === t.id ? null : t.id)}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                            <div style={{
                              width: '30px', height: '30px', borderRadius: '50%',
                              background: '#000', color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.8rem', fontWeight: '800', flexShrink: 0,
                            }}>
                              {t.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: '800', color: '#000' }}>{t.name}</span>
                          </div>
                        </td>
                        <td><span className="badge badge-info">{t.region || '—'}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{t.invs.length}</td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: '28px', padding: '2px 8px',
                            background: t.corretos > 0 ? '#000' : '#f0f0f0',
                            color: t.corretos > 0 ? '#fff' : '#999',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800',
                          }}>{t.corretos}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: '28px', padding: '2px 8px',
                            background: t.comDiv > 0 ? '#555' : '#f0f0f0',
                            color: t.comDiv > 0 ? '#fff' : '#999',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800',
                          }}>{t.comDiv}</span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-block', minWidth: '28px', padding: '2px 8px',
                            background: t.recontagens > 0 ? '#888' : '#f0f0f0',
                            color: t.recontagens > 0 ? '#fff' : '#999',
                            borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700',
                          }}>{t.recontagens}</span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: t.totalDiv > 0 ? '#000' : '#bbb' }}>
                          {t.totalDiv}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-bar" style={{ flex: 1 }}>
                              <div className="progress-fill" style={{ width: `${t.rate}%` }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', fontWeight: '800', minWidth: '34px', textAlign: 'right' }}>
                              {t.rate}%
                            </span>
                          </div>
                        </td>
                      </tr>

                      {/* Linha expandida: inventários do técnico */}
                      {expanded === t.id && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: '#fafafa', borderBottom: '2px solid #eee' }}>
                            <table style={{ width: '100%', fontSize: '0.8rem' }}>
                              <thead>
                                <tr style={{ background: '#f0f0f0' }}>
                                  <th style={{ padding: '0.4rem 1rem' }}>Semana</th>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Status</th>
                                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>Progresso</th>
                                  <th style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>Divergências</th>
                                  <th style={{ padding: '0.4rem 0.5rem' }}>Duração</th>
                                  <th style={{ padding: '0.4rem 1rem' }}>Início</th>
                                </tr>
                              </thead>
                              <tbody>
                                {t.invs.map((inv) => {
                                  const pct = inv.total_items > 0
                                    ? Math.round((inv.counted_items / inv.total_items) * 100)
                                    : 0;
                                  return (
                                    <tr key={inv.id} style={{ borderTop: '1px solid #eee' }}>
                                      <td style={{ padding: '0.5rem 1rem', fontWeight: '700' }}>{inv.week_ref || '—'}</td>
                                      <td style={{ padding: '0.5rem' }}><StatusBadge status={inv.status} /></td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                                          <div className="progress-bar" style={{ width: '60px' }}>
                                            <div className="progress-fill" style={{ width: `${pct}%` }} />
                                          </div>
                                          <span style={{ fontWeight: '700' }}>{pct}%</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: '0.5rem', textAlign: 'center', fontWeight: '800', color: inv.divergence_count > 0 ? '#000' : '#bbb' }}>
                                        {inv.divergence_count}
                                      </td>
                                      <td style={{ padding: '0.5rem', color: '#666' }}>{formatDuration(inv.started_at, inv.completed_at)}</td>
                                      <td style={{ padding: '0.5rem 1rem', color: '#666' }}>{formatDate(inv.started_at || inv.created_at)}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value, highlight, alert }) {
  return (
    <div className="card" style={{
      border: `1px solid ${alert ? '#000' : '#e8e8e8'}`,
      background: alert ? '#000' : '#fff',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: alert ? '#fff' : '#888', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: alert ? '#fff' : '#000', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
