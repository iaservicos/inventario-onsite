'use client';

import { useState, useEffect, useCallback } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const TYPE_LABELS = {
  abandonment: 'Abandono',
  recount_pending: 'Recontagem',
  divergence_critical: 'Divergência Crítica',
  integration_error: 'Erro de Integração',
  timeout: 'Timeout',
};

const SEVERITY_BORDER = {
  low:      '#e4e4e7',
  medium:   '#a1a1aa',
  high:     '#52525b',
  critical: '#a1a1aa',
};

export default function AlertasPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showResolved, setShowResolved] = useState(false);
  const [resolving, setResolving] = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    if (!showResolved) params.set('resolved', 'false');
    const res = await fetch(`/api/alerts?${params}`);
    const json = await res.json();
    setAlerts(json);
    setLoading(false);
  }, [filters, showResolved]);

  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    setResolving(id);
    try {
      await fetch(`/api/alerts/${id}`, { method: 'PATCH' });
      toast.success('Alerta resolvido!');
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
    return `${h}h ${min % 60}min atrás`;
  }

  const statusOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'abandonment', label: 'Abandono' },
    { value: 'recount_pending', label: 'Recontagem' },
    { value: 'divergence_critical', label: 'Divergência Crítica' },
    { value: 'integration_error', label: 'Erro de Integração' },
  ];

  const filtered = filters.status ? alerts.filter((a) => a.type === filters.status) : alerts;
  const active = filtered.filter((a) => !a.resolved);
  const resolved = filtered.filter((a) => a.resolved);

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1200px' }}>
      <PageHeader
        title="Alertas"
        subtitle="Monitoramento de abandonos, recontagens e erros críticos"
        actions={
          <button
            className={`btn ${showResolved ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? 'Ocultar Resolvidos' : 'Ver Resolvidos'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} statusOptions={statusOptions} />

      <div style={{ height: '1.25rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            <SummaryBadge label="Ativos" value={active.length} />
            <SummaryBadge label="Críticos" value={active.filter((a) => a.severity === 'critical').length} />
            <SummaryBadge label="Altos" value={active.filter((a) => a.severity === 'high').length} />
            <SummaryBadge label="Resolvidos" value={resolved.length} />
          </div>

          {active.length === 0 && !showResolved ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: '#a1a1aa' }}>✓</div>
              <div style={{ color: '#f4f4f5', fontWeight: '600' }}>Nenhum alerta ativo</div>
              <div style={{ color: '#52525b', fontSize: '0.875rem', marginTop: '0.25rem' }}>Todos os inventários estão dentro do esperado</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {active.map((a) => (
                <AlertCard key={a.id} alert={a} onResolve={resolve} resolving={resolving} getElapsed={getElapsed} />
              ))}
              {showResolved && resolved.map((a) => (
                <AlertCard key={a.id} alert={a} resolved getElapsed={getElapsed} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AlertCard({ alert: a, onResolve, resolving, resolved, getElapsed }) {
  const borderColor = resolved ? '#e4e4e7' : SEVERITY_BORDER[a.severity] || '#e4e4e7';
  const elapsed = Date.now() - new Date(a.created_at).getTime();
  const hours = elapsed / 3600000;

  return (
    <div
      style={{
        background: '#f4f4f5',
        border: `1px solid ${borderColor}`,
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '1rem 1.25rem',
        opacity: resolved ? 0.5 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem', flexWrap: 'wrap' }}>
          <StatusBadge status={a.severity} />
          <span style={{ fontSize: '0.75rem', color: '#71717a', background: '#f4f4f5', padding: '2px 8px', borderRadius: '4px', border: '1px solid #e4e4e7' }}>
            {TYPE_LABELS[a.type] || a.type}
          </span>
          {!resolved && hours >= 4 && (
            <span style={{ fontSize: '0.7rem', color: '#f4f4f5', fontWeight: '700', letterSpacing: '0.05em', background: '#e4e4e7', padding: '2px 6px', borderRadius: '3px' }}>ESCALADO</span>
          )}
        </div>
        <div style={{ fontWeight: '600', color: '#f4f4f5', marginBottom: '0.25rem' }}>{a.title}</div>
        {a.description && <div style={{ fontSize: '0.8rem', color: '#71717a', marginBottom: '0.375rem' }}>{a.description}</div>}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#52525b', flexWrap: 'wrap' }}>
          {a.technicians?.name && <span>Técnico: {a.technicians.name}</span>}
          <span>{getElapsed(a.created_at)}</span>
          {resolved && a.resolved_by && <span>Resolvido por: {a.resolved_by}</span>}
          {resolved && a.resolved_at && <span>em {formatDate(a.resolved_at)}</span>}
        </div>
      </div>
      {!resolved && onResolve && (
        <button
          className="btn btn-secondary"
          style={{ fontSize: '0.8rem', flexShrink: 0 }}
          onClick={() => onResolve(a.id)}
          disabled={resolving === a.id}
        >
          {resolving === a.id ? 'Resolvendo...' : 'Marcar Resolvido'}
        </button>
      )}
    </div>
  );
}

function SummaryBadge({ label, value }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.875rem',
        background: '#f4f4f5',
        border: '1px solid #e4e4e7',
        borderRadius: '8px',
      }}
    >
      <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f4f4f5' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{label}</span>
    </div>
  );
}
