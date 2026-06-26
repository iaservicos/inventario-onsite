'use client';

import { useState, useEffect, useCallback } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';

export default function LogsPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '' });
  const [technicians, setTechnicians] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.technicianId) params.set('technicianId', filters.technicianId);
    const res = await fetch(`/api/logs?${params}`);
    const json = await res.json();
    setHistory(Array.isArray(json) ? json : []);
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const filtered = search
    ? history.filter((r) =>
        (r.item_code || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.item_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.technicians?.name || '').toLowerCase().includes(search.toLowerCase())
      )
    : history;

  const recontagens   = history.filter((r) => r.count_number > 1).length;
  const tecnicos      = new Set(history.map((r) => r.technicians?.id)).size;
  const totalContagens = history.length;

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%', background: 'var(--color-bg-primary)' }}>
      <PageHeader
        title="Histórico de Contagens"
        subtitle="Registro completo de cada item contado, com recontagens e quantidades informadas"
      />

      <FilterBar filters={filters} onChange={(f) => setFilters({ from: f.from, to: f.to, technicianId: f.technicianId })} technicians={technicians} />

      <div style={{ height: '1.5rem' }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <KpiCard label="Total de registros" value={totalContagens} />
        <KpiCard label="Recontagens"         value={recontagens} alert={recontagens > 0} />
        <KpiCard label="Técnicos"            value={tecnicos} />
      </div>

      <div className="card" style={{ marginBottom: '2rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border-light)' }}>
        <input
          type="text"
          className="input"
          placeholder="Buscar por código, nome da peça ou técnico..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ borderRadius: '8px', border: '1px solid var(--color-border-light)' }}
        />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: 'var(--color-text-tertiary)' }}>
              Nenhum registro encontrado
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>UF</th>
                  <th>Código</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'center' }}>Contagem #</th>
                  <th style={{ textAlign: 'right' }}>Qtd. Informada</th>
                  <th style={{ textAlign: 'right' }}>Qtd. Sistema</th>
                  <th style={{ textAlign: 'right' }}>Diferença</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const diff = Number(r.physical_qty) - Number(r.system_qty);
                  const isRecount = r.count_number > 1;
                  return (
                    <tr key={r.id} style={{ background: isRecount ? 'var(--color-bg-tertiary)' : 'transparent' }}>
                      <td style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>{r.technicians?.name || '—'}</td>
                      <td><span className="badge badge-info">{r.technicians?.region || '—'}</span></td>
                      <td>
                        <code style={{ fontSize: '0.75rem', background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border-light)' }}>
                          {r.item_code}
                        </code>
                      </td>
                      <td style={{ fontWeight: '600', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.item_name}</td>
                      <td style={{ textAlign: 'center' }}>
                        {isRecount ? (
                          <span style={{ fontWeight: '800', fontSize: '0.75rem', background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', padding: '2px 8px', borderRadius: '999px' }}>
                            #{r.count_number}
                          </span>
                        ) : (
                          <span style={{ color: '#aaa', fontWeight: '600', fontSize: '0.8rem' }}>1ª</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: '800' }}>{r.physical_qty}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{r.system_qty}</td>
                      <td style={{ textAlign: 'right', fontWeight: '800', color: diff !== 0 ? 'var(--color-text-primary)' : '#bbb' }}>
                        {diff !== 0 ? (diff > 0 ? `+${diff}` : diff) : '—'}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
                        {formatDate(r.counted_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, alert: isAlert }) {
  return (
    <div className="card" style={{
      border: `2px solid ${isAlert && value > 0 ? 'var(--color-accent-cyan)' : 'var(--color-border-light)'}`,
      background: 'var(--color-bg-secondary)',
      borderRadius: '12px',
      padding: '1.5rem',
      transition: '0.3s'
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: isAlert && value > 0 ? 'var(--color-accent-cyan)' : 'var(--color-text-tertiary)', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: isAlert && value > 0 ? 'var(--color-accent-cyan)' : 'var(--color-text-primary)', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
