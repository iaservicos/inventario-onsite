'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterBar from '@/components/ui/FilterBar';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'recount_pending', label: 'Recontagem' },
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

  const ok        = items.filter(i => !i.has_divergence).length;
  const diverg    = items.filter(i => i.has_divergence).length;
  const pendentes = items.filter(i => i.physical_qty === null).length;

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', width: '100%', maxWidth: '800px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase' }}>
              {inventory.technicians?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#aaa', marginTop: '2px' }}>
              Semana {inventory.week_ref} &nbsp;·&nbsp; {inventory.technicians?.region}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900', color: '#fff' }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: '1px solid #eee' }}>
          {[
            { label: 'Total', value: items.length, color: '#000' },
            { label: 'Corretas', value: ok, color: '#16a34a' },
            { label: 'Divergentes', value: diverg, color: diverg > 0 ? '#dc2626' : '#000' },
            { label: 'Pendentes', value: pendentes, color: pendentes > 0 ? '#d97706' : '#000' },
          ].map(k => (
            <div key={k.label} style={{ padding: '1rem', textAlign: 'center', borderRight: '1px solid #eee' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: k.color }}>{loading ? '—' : k.value}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Carregando...</div>
          ) : items.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Nenhuma peça encontrada</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #e4e4e7' }}>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Código</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Item</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Subgrupo</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Sistema</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Físico</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'right', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Diff</th>
                  <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: '800', fontSize: '0.7rem', textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const diff     = item.physical_qty !== null ? Number(item.physical_qty) - Number(item.system_qty) : null;
                  const pending  = item.physical_qty === null;
                  const rowBg    = item.has_divergence ? '#fff8f8' : pending ? '#fffbeb' : '#fff';
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: rowBg }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <code style={{ fontSize: '0.72rem', background: '#f5f5f5', padding: '2px 5px', borderRadius: '3px', border: '1px solid #eee' }}>
                          {item.item_code}
                        </code>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: '600', color: '#000' }}>{item.item_name}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#666', fontSize: '0.72rem' }}>{item.item_subgroup || '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#666' }}>{item.system_qty}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '700', color: pending ? '#d97706' : '#000' }}>
                        {pending ? '—' : item.physical_qty}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '800', color: diff === null ? '#aaa' : diff === 0 ? '#16a34a' : '#dc2626' }}>
                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                        <StatusBadge status={pending ? 'pending' : item.has_divergence ? 'divergence' : 'ok'} />
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
  const [filters, setFilters]       = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then(r => r.json()).then(setTechnicians);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from)          params.set('from', filters.from);
    if (filters.to)            params.set('to', filters.to);
    if (filters.technicianId)  params.set('technicianId', filters.technicianId);
    if (filters.status)        params.set('status', filters.status);
    const res = await fetch(`/api/inventories?${params}`);
    setInventories(await res.json());
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  const STATUS_LABEL = {
    in_progress:     'Em andamento',
    completed:       'Concluído',
    recount_pending: 'Recontagem',
    cancelled:       'Cancelado',
    pending:         'Pendente',
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Histórico de Inventário"
        subtitle="Consulte todas as peças contadas por inventário"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} statusOptions={STATUS_OPTIONS} />

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
                  <th style={{ textAlign: 'center' }}>Peças</th>
                  <th style={{ textAlign: 'center' }}>Divergências</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th>Ações</th>
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
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>{inv.total_items ?? '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {inv.divergence_count > 0
                          ? <span style={{ fontWeight: '900', color: '#dc2626' }}>{inv.divergence_count}</span>
                          : <span style={{ color: '#16a34a', fontWeight: '700' }}>0</span>}
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
