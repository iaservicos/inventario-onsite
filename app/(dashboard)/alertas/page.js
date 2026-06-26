'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_LABELS = {
  abandonment:         'Abandono',
  recount:             'Recontagem',
  recount_pending:     'Recontagem',
  divergence_critical: 'Divergência Crítica',
  integration_error:   'Erro de Integração',
  timeout:             'Tempo Esgotado',
  surplus:             'Excedente',
  surplus_subgroup:    'Peça de outro subgrupo',
};

const TYPE_ICON = {
  abandonment:         '⏸',
  recount:             '↺',
  recount_pending:     '↺',
  divergence_critical: '⚠',
  integration_error:   '✕',
  timeout:             '⏱',
  surplus:             '↑',
  surplus_subgroup:    '↗',
};

const SEVERITY_STYLE = {
  low:      { border: 'var(--color-border-light)',  bg: 'var(--color-bg-primary)',   label: 'Baixo' },
  medium:   { border: 'var(--color-text-tertiary)',  bg: 'var(--color-bg-primary)',   label: 'Médio' },
  high:     { border: 'var(--color-text-secondary)',  bg: 'var(--color-bg-tertiary)', label: 'Alto' },
  critical: { border: 'var(--color-text-primary)',  bg: 'var(--color-text-primary)',   label: 'Crítico', dark: true },
};

const statusOptions = [
  { value: '',                 label: 'Todos os tipos' },
  { value: 'surplus_subgroup', label: 'Peça de outro subgrupo' },
  { value: 'surplus',          label: 'Excedente' },
  { value: 'recount',          label: 'Recontagem' },
  { value: 'abandonment',      label: 'Abandono' },
  { value: 'divergence_critical', label: 'Divergência Crítica' },
];

export default function AlertasPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '', supervisor: '' });
  const [technicians, setTechnicians] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const supervisors = useMemo(() =>
    [...new Set(technicians.filter(t => t.supervisor_name).map(t => t.supervisor_name))].sort(),
    [technicians]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (!showResolved) params.set('resolved', 'false');
    if (filters.technicianId) {
      params.set('technicianId', filters.technicianId);
    } else if (filters.supervisor) {
      const ids = technicians.filter(t => t.supervisor_name === filters.supervisor).map(t => t.id);
      if (ids.length > 0) params.set('technicianIds', ids.join(','));
    }
    const res = await fetch(`/api/alerts?${params}`);
    const json = await res.json();
    setAlerts(json);
    setLoading(false);
  }, [filters, showResolved]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    setResolving(id);
    try {
      await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
      toast.success('Alerta marcado como resolvido');
      load();
    } catch {
      toast.error('Erro ao resolver alerta');
    }
    setResolving(null);
  }

  function getElapsed(createdAt) {
    const diff = Date.now() - new Date(createdAt).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}min atrás`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ${min % 60}min atrás`;
    return formatDate(createdAt);
  }

  const byType = filters.status ? alerts.filter((a) => a.type === filters.status) : alerts;
  const active   = byType.filter((a) => !a.resolved);
  const resolved = byType.filter((a) => a.resolved);

  const surplusSubgroup = active.filter((a) => a.type === 'surplus_subgroup');
  const surplusItems    = active.filter((a) => a.type === 'surplus');
  const recounts        = active.filter((a) => a.type === 'recount' || a.type === 'recount_pending');
  const outros          = active.filter((a) => !['surplus_subgroup', 'surplus', 'recount', 'recount_pending'].includes(a.type));

  return (
    <DashboardLayout
      title="Alertas"
      subtitle="Monitoramento de excedentes, recontagens e erros"
    >
      <div style={{ marginBottom: '2rem' }}>
        <button
          className={`btn ${showResolved ? '' : 'btn-secondary'}`}
          onClick={() => setShowResolved(!showResolved)}
          style={{ borderRadius: '8px', transition: '0.2s' }}
        >
          {showResolved ? 'Ocultar resolvidos' : 'Ver resolvidos'}
        </button>
      </div>

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} statusOptions={statusOptions} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            <KpiCard label="Ativos"                 value={active.length}           alert={active.length > 0} />
            <KpiCard label="Peça outro subgrupo"    value={surplusSubgroup.length}  alert={surplusSubgroup.length > 0} />
            <KpiCard label="Excedentes"             value={surplusItems.length}     alert={surplusItems.length > 0} />
            <KpiCard label="Recontagens"            value={recounts.length} />
            <KpiCard label="Resolvidos"             value={resolved.length} />
          </div>

          {active.length === 0 && !showResolved ? (
            <div className="card" style={{ textAlign: 'center', padding: '4rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✓</div>
              <div style={{ fontWeight: '800', fontSize: '1rem' }}>Nenhum alerta ativo</div>
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Todos os inventários estão dentro do esperado</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {/* Peças de outro subgrupo primeiro — são as mais críticas para o supervisor */}
              {surplusSubgroup.length > 0 && !filters.status && (
                <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem', marginTop: '0.5rem' }}>
                  Peças de outro subgrupo
                </div>
              )}
              {surplusSubgroup.map((a) => (
                <AlertCard key={a.id} alert={a} onResolve={resolve} resolving={resolving} getElapsed={getElapsed} />
              ))}

              {outros.length > 0 && !filters.status && surplusSubgroup.length > 0 && (
                <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem', marginTop: '0.75rem' }}>
                  Outros alertas
                </div>
              )}
              {[...surplusItems, ...recounts, ...outros].map((a) => (
                <AlertCard key={a.id} alert={a} onResolve={resolve} resolving={resolving} getElapsed={getElapsed} />
              ))}

              {showResolved && resolved.length > 0 && (
                <>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', margin: '1rem 0 0.25rem' }}>
                    Resolvidos
                  </div>
                  {resolved.map((a) => (
                    <AlertCard key={a.id} alert={a} isResolved getElapsed={getElapsed} />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

function AlertCard({ alert: a, onResolve, resolving, isResolved, getElapsed }) {
  const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium;
  const elapsed = (Date.now() - new Date(a.created_at).getTime()) / 3600000;

  return (
    <div style={{
      background: isResolved ? 'var(--color-bg-tertiary)' : sev.bg,
      border: `1px solid ${sev.border}`,
      borderLeft: `4px solid ${sev.border}`,
      borderRadius: '12px',
      padding: '1rem 1.25rem',
      opacity: isResolved ? 0.6 : 1,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '1rem',
      flexWrap: 'wrap',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
            padding: '2px 7px', borderRadius: '4px',
            background: sev.dark ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
            color: sev.dark ? 'var(--color-text-primary)' : 'var(--color-bg-primary)',
          }}>
            {sev.label}
          </span>
          <span style={{
            fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-secondary)',
            background: 'var(--color-bg-tertiary)', padding: '2px 8px', borderRadius: '4px',
          }}>
            {TYPE_ICON[a.type] || '•'} {TYPE_LABELS[a.type] || a.type}
          </span>
          {!isResolved && elapsed >= 4 && (
            <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--color-bg-primary)', background: 'var(--color-text-secondary)', padding: '2px 6px', borderRadius: '3px', letterSpacing: '0.04em' }}>
              PENDENTE {Math.floor(elapsed)}H
            </span>
          )}
        </div>

        <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '0.25rem', fontSize: '0.9rem' }}>{a.title}</div>

        {a.description && (
          <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '0.375rem', lineHeight: 1.5 }}>{a.description}</div>
        )}

        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: '600', flexWrap: 'wrap' }}>
          {a.technicians?.name && <span>Técnico: <strong style={{ color: 'var(--color-text-primary)' }}>{a.technicians.name}</strong></span>}
          <span>{getElapsed(a.created_at)}</span>
          {isResolved && a.resolved_by && <span>Resolvido por: {a.resolved_by}</span>}
          {isResolved && a.resolved_at && <span>em {formatDate(a.resolved_at)}</span>}
        </div>
      </div>

      {!isResolved && onResolve && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', flexShrink: 0, alignSelf: 'center' }}
          onClick={() => onResolve(a.id)}
          disabled={resolving === a.id}
        >
          {resolving === a.id ? 'Resolvendo...' : 'Resolver'}
        </button>
      )}
    </div>
  );
}

function KpiCard({ label, value, alert: isAlert }) {
  return (
    <div className="card" style={{
      border: `2px solid ${isAlert ? 'var(--color-accent-cyan)' : 'var(--color-border-light)'}`,
      background: 'var(--color-bg-secondary)',
      borderRadius: '12px',
      padding: '1.5rem',
      transition: '0.3s'
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: isAlert ? 'var(--color-accent-cyan)' : 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: isAlert ? 'var(--color-accent-cyan)' : 'var(--color-text-primary)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
