'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterBar from '@/components/ui/FilterBar';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'recount_pending', label: '1ª Contagem' },
  { value: 'dispatched', label: 'Recontagem' },
  { value: 'cancelled', label: 'Cancelado' },
];

function ModalItens({ inventory, onClose }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventories/${inventory.id}/items`)
      .then(r => r.json())
      .then(data => { setItems(data); setLoading(false); });
  }, [inventory.id]);

  const total    = items.length;
  const ok       = items.filter(i => !i.has_divergence && i.physical_qty !== null).length;
  const diverg   = items.filter(i => i.has_divergence).length;
  const pendente = items.filter(i => i.physical_qty === null).length;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
    >
      <div
        style={{ background: '#fff', width: '100%', maxWidth: '860px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {inventory.technicians?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', fontWeight: '600' }}>
              Semana {inventory.week_ref} &nbsp;·&nbsp; {inventory.technicians?.region} &nbsp;·&nbsp; {inventory.inventory_schedules?.[0]?.scheduled_subgroup || '—'}
              {inventory.is_recount != null && (
                <span style={{ marginLeft: '0.5rem', background: '#000', color: '#fff', borderRadius: '3px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.06em' }}>
                  {inventory.is_recount ? 'RECONTAGEM' : '1ª CONTAGEM'}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900', color: '#000' }}>✕</button>
        </div>

        {/* KPIs */}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #e4e4e7' }}>
            {[
              { label: 'Total',       value: total },
              { label: 'Corretas',    value: ok,       highlight: false },
              { label: 'Divergentes', value: diverg,   highlight: diverg > 0 },
              { label: 'Pendentes',   value: pendente, highlight: pendente > 0 },
            ].map((k, i) => (
              <div key={k.label} style={{
                padding: '1rem',
                textAlign: 'center',
                borderRight: i < 3 ? '1px solid #e4e4e7' : 'none',
                background: k.highlight ? '#000' : '#fff',
              }}>
                <div style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: k.highlight ? '#aaa' : '#888', marginBottom: '4px' }}>
                  {k.label}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '900', color: k.highlight ? '#fff' : '#000' }}>
                  {k.value}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabela */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Carregando...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Nenhuma peça encontrada</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e4e4e7' }}>
                  {['Código', 'Item', 'Subgrupo', 'Sistema', 'Físico', 'Diferença', 'Status'].map((h, i) => (
                    <th key={h} style={{
                      padding: '0.6rem 0.75rem',
                      textAlign: i >= 3 && i <= 5 ? 'right' : i === 6 ? 'center' : 'left',
                      fontWeight: '800',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: '#888',
                      background: '#fafafa',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff    = item.physical_qty !== null ? Number(item.physical_qty) - Number(item.system_qty) : null;
                  const pending = item.physical_qty === null;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <code style={{ fontSize: '0.72rem', background: '#f5f5f5', padding: '2px 5px', borderRadius: '3px', border: '1px solid #eee' }}>
                          {item.item_code}
                        </code>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: '700', color: '#000' }}>{item.item_name}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#666', fontSize: '0.75rem' }}>{item.item_subgroup || '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#666' }}>{item.system_qty ?? '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '700', color: pending ? '#888' : '#000' }}>
                        {pending ? '—' : item.physical_qty}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '800', color: '#000' }}>
                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff === 0 ? '✓' : diff}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                        <StatusBadge status={pending ? 'pending' : item.has_divergence ? 'recount' : 'counted'} />
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

export default function HistoricoPage() {
  const [filters, setFilters]         = useState({ from: '', to: '', technicianId: '', status: '', supervisor: '' });
  const [technicians, setTechnicians] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then(r => r.json()).then(setTechnicians);
  }, []);

  const supervisors = useMemo(() =>
    [...new Set(technicians.filter(t => t.supervisor_name).map(t => t.supervisor_name))].sort(),
    [technicians]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from)   params.set('from', filters.from);
    if (filters.to)     params.set('to', filters.to);
    if (filters.status) params.set('status', filters.status);
    if (filters.technicianId) {
      params.set('technicianId', filters.technicianId);
    } else if (filters.supervisor) {
      const ids = technicians.filter(t => t.supervisor_name === filters.supervisor).map(t => t.id);
      if (ids.length > 0) params.set('technicianIds', ids.join(','));
    }
    const res = await fetch(`/api/inventories?${params}`);
    setInventories(await res.json());
    setLoading(false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Histórico de Inventário"
        subtitle="Consulte todas as peças contadas por inventário"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} statusOptions={STATUS_OPTIONS} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Carregando...</div>
      ) : inventories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: '#888' }}>Nenhum inventário encontrado</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Região</th>
                  <th>Semana</th>
                  <th>Subgrupo</th>
                  <th>Fase</th>
                  <th style={{ textAlign: 'center' }}>Peças</th>
                  <th style={{ textAlign: 'center' }}>Divergências</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {inventories.map(inv => {
                  const sched = inv.inventory_schedules?.[0];
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: '800', color: '#000' }}>{inv.technicians?.name || '—'}</td>
                      <td style={{ color: '#666' }}>{inv.technicians?.region || '—'}</td>
                      <td style={{ fontWeight: '700' }}>{inv.week_ref}</td>
                      <td style={{ color: '#666', fontSize: '0.8rem' }}>{sched?.scheduled_subgroup || '—'}</td>
                      <td>
                        {inv.is_recount != null
                          ? <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>{inv.is_recount ? 'Recontagem' : '1ª Contagem'}</span>
                          : <span style={{ color: '#ccc', fontSize: '0.75rem' }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{inv.total_items ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: '800' }}>
                        {inv.divergence_count > 0
                          ? <span style={{ background: '#000', color: '#fff', padding: '1px 7px', borderRadius: '4px', fontSize: '0.75rem' }}>{inv.divergence_count}</span>
                          : <span style={{ color: '#888' }}>0</span>}
                      </td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td style={{ color: '#666', fontSize: '0.8rem' }}>{inv.created_at ? formatDate(inv.created_at) : '—'}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', border: '1px solid #000', fontWeight: '700' }}
                          onClick={() => setSelected(inv)}
                        >
                          Ver peças
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <ModalItens inventory={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
