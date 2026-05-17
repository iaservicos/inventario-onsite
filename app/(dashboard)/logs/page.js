'use client';

import { useState, useEffect, useCallback } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';

const SOURCE_OPTIONS = [
  { value: '', label: 'Todas as fontes' },
  { value: 'power_automate', label: 'Power Automate' },
  { value: 'dispara_ai', label: 'Dispara.AI' },
  { value: 'system', label: 'Sistema' },
  { value: 'user', label: 'Usuário' },
];

const LEVEL_OPTIONS = [
  { value: '', label: 'Todos os níveis' },
  { value: 'info', label: 'Info' },
  { value: 'success', label: 'Sucesso' },
  { value: 'warning', label: 'Aviso' },
  { value: 'error', label: 'Erro' },
];

const SOURCE_COLORS = {
  power_automate: '#71717a',
  dispara_ai: '#52525b',
  system: '#a1a1aa',
  user: '#71717a',
};

const SOURCE_LABELS = {
  power_automate: 'Power Automate',
  dispara_ai: 'Dispara.AI',
  system: 'Sistema',
  user: 'Usuário',
};

export default function LogsPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [source, setSource] = useState('');
  const [level, setLevel] = useState('');
  const [search, setSearch] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    if (source) params.set('source', source);
    if (level) params.set('level', level);
    const res = await fetch(`/api/logs?${params}`);
    const json = await res.json();
    setLogs(json);
    setLoading(false);
  }, [filters, source, level]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? logs.filter((l) => l.message.toLowerCase().includes(search.toLowerCase()) || l.action.toLowerCase().includes(search.toLowerCase()))
    : logs;

  const errors = logs.filter((l) => l.level === 'error').length;
  const warnings = logs.filter((l) => l.level === 'warning').length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px' }}>
      <PageHeader
        title="Logs de Fluxo"
        subtitle="Registro centralizado de eventos do Power Automate e Dispara.AI"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '0.75rem' }} />

      <div className="filter-bar" style={{ marginBottom: '1rem' }}>
        <select
          className="input"
          style={{ width: '180px' }}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          {SOURCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="input"
          style={{ width: '150px' }}
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          {LEVEL_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          className="input"
          style={{ flex: 1, minWidth: '200px' }}
          placeholder="Buscar por mensagem ou ação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <SummaryBadge label="Total" value={logs.length} />
        <SummaryBadge label="Erros" value={errors} />
        <SummaryBadge label="Avisos" value={warnings} />
        <SummaryBadge label="Power Automate" value={logs.filter((l) => l.source === 'power_automate').length} />
        <SummaryBadge label="Dispara.AI" value={logs.filter((l) => l.source === 'dispara_ai').length} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>Carregando...</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#52525b' }}>Nenhum log encontrado</div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {filtered.map((log, i) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    borderBottom: i < filtered.length - 1 ? '1px solid #f4f4f5' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f4f4f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: { info: '#52525b', success: '#a1a1aa', warning: '#71717a', error: '#f4f4f5' }[log.level] || '#52525b', marginTop: '6px', flexShrink: 0 }} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: '600',
                          color: '#71717a',
                          background: '#f4f4f5',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          border: '1px solid #e4e4e7',
                        }}
                      >
                        {SOURCE_LABELS[log.source] || log.source}
                      </span>
                      <StatusBadge status={log.level} size="xs" />
                      <span style={{ fontSize: '0.7rem', color: '#52525b', fontFamily: 'monospace' }}>{log.action}</span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#f4f4f5' }}>{log.message}</div>
                    {log.technicians?.name && (
                      <div style={{ fontSize: '0.75rem', color: '#52525b', marginTop: '2px' }}>Técnico: {log.technicians.name}</div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.7rem', color: '#52525b', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {formatDate(log.created_at)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryBadge({ label, value }) {
  return (
    <div style={{ padding: '0.4rem 0.75rem', background: '#f4f4f5', border: '1px solid #e4e4e7', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
      <span style={{ fontWeight: '700', color: '#f4f4f5' }}>{value}</span>
      <span style={{ fontSize: '0.75rem', color: '#71717a' }}>{label}</span>
    </div>
  );
}
