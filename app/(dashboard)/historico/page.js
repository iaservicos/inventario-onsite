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
  { value: 'recount_pending', label: 'Aguardando recontagem' },
  { value: 'cancelled', label: 'Cancelado' },
];

/* ─── Modal: peças de um inventário ──────────────────────────────────────── */
function ModalItens({ inventory, onClose }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/inventories/${inventory.id}/items`)
      .then(r => r.json())
      .then(data => { setItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, [inventory.id]);

  const total   = items.length;
  const ok      = items.filter(i => !i.has_divergence && i.physical_qty !== null).length;
  const diverg  = items.filter(i => i.has_divergence).length;
  const pending = items.filter(i => i.physical_qty === null).length;

  const fase = inventory.is_recount === true ? 'RECONTAGEM' : inventory.is_recount === false ? '1ª CONTAGEM' : null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '860px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {inventory.technicians?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', fontWeight: '600' }}>
              Semana {inventory.week_ref} &nbsp;·&nbsp; {inventory.technicians?.region} &nbsp;·&nbsp; {inventory.inventory_schedules?.[0]?.scheduled_subgroup || '—'}
              {fase && (
                <span style={{ marginLeft: '0.5rem', background: '#000', color: '#fff', borderRadius: '3px', padding: '1px 6px', fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.06em' }}>
                  {fase}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900', color: '#000' }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e4e4e7' }}>
          {[
            { label: 'Total',        value: total,  },
            { label: 'OK',           value: ok,     },
            { label: 'Divergências', value: diverg, },
            { label: 'Pendentes',    value: pending,},
          ].map((k, i) => (
            <div key={i} style={{ flex: 1, padding: '0.75rem', textAlign: 'center', borderRight: i < 3 ? '1px solid #e4e4e7' : 'none' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#000' }}>{loading ? '—' : k.value}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginTop: '1px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Carregando peças...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Nenhuma peça registrada</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #e4e4e7' }}>
                  {['Código', 'Item', 'Subgrupo', 'Sistema', 'Físico', 'Diferença', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888', background: '#fafafa' }}>{h}</th>
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

/* ─── Ícone de seta de log ───────────────────────────────────────────────── */
function StepArrow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', paddingLeft: '1.5rem', paddingBottom: '2px' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}

/* ─── Página principal ───────────────────────────────────────────────────── */
export default function HistoricoPage() {
  const [filters, setFilters]         = useState({ from: '', to: '', technicianId: '', status: '', supervisor: '' });
  const [technicians, setTechnicians] = useState([]);
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then(r => r.json()).then(d => setTechnicians(Array.isArray(d) ? d : []));
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
    const raw = await res.json();
    setInventories(Array.isArray(raw) ? raw : []);
    setLoading(false);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Agrupa por técnico + semana e ordena internamente por is_recount (1ª primeiro)
  const groups = useMemo(() => {
    const map = {};
    inventories.forEach(inv => {
      const key = `${inv.technician_id}|${inv.week_ref}`;
      if (!map[key]) map[key] = [];
      map[key].push(inv);
    });
    return Object.values(map)
      .map(g => g.sort((a, b) => {
        // false/null antes de true (1ª contagem antes de recontagem)
        const ra = a.is_recount ? 1 : 0;
        const rb = b.is_recount ? 1 : 0;
        if (ra !== rb) return ra - rb;
        return new Date(a.created_at) - new Date(b.created_at);
      }))
      // Ordena grupos pelo mais recente (data do último inventário do grupo)
      .sort((a, b) => new Date(b[b.length - 1].created_at) - new Date(a[a.length - 1].created_at));
  }, [inventories]);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Histórico de Inventário"
        subtitle="Log de contagens por técnico e semana"
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} statusOptions={STATUS_OPTIONS} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: '#888' }}>Carregando...</div>
      ) : groups.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: '#888' }}>Nenhum inventário encontrado</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map((group, gi) => {
            const first  = group[0];
            const tech   = first.technicians;
            const sched  = first.inventory_schedules?.[0];
            const hasRecount = group.some(i => i.is_recount === true);

            return (
              <div key={gi} style={{ border: '1px solid #e4e4e7', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                {/* Cabeçalho do grupo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.7rem 1.25rem', background: '#f8f8f8', borderBottom: '1px solid #e4e4e7', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '900', fontSize: '0.88rem', color: '#000' }}>{tech?.name || '—'}</span>
                  <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '600' }}>{tech?.region}</span>
                  <span style={{ fontSize: '0.65rem', background: '#000', color: '#fff', padding: '2px 7px', borderRadius: '3px', fontWeight: '800', letterSpacing: '0.04em' }}>
                    {first.week_ref}
                  </span>
                  {sched?.scheduled_subgroup && (
                    <span style={{ fontSize: '0.72rem', color: '#666', fontWeight: '600' }}>{sched.scheduled_subgroup}</span>
                  )}
                  {hasRecount && (
                    <span style={{ fontSize: '0.65rem', color: '#888', fontWeight: '700', marginLeft: 'auto' }}>
                      ↻ com recontagem
                    </span>
                  )}
                </div>

                {/* Entradas do log */}
                {group.map((inv, i) => {
                  const isRecount = inv.is_recount === true;
                  const hasDiv    = (inv.divergence_count || 0) > 0;

                  return (
                    <div key={inv.id}>
                      {i > 0 && <StepArrow />}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap',
                        padding: isRecount ? '0.65rem 1.25rem 0.65rem 2rem' : '0.65rem 1.25rem',
                        background: isRecount ? '#fafafa' : '#fff',
                        borderBottom: i < group.length - 1 ? '1px dashed #f0f0f0' : 'none',
                      }}>
                        {/* Fase */}
                        <div style={{ minWidth: '100px' }}>
                          <span style={{
                            fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                            color: isRecount ? '#666' : '#000',
                            borderLeft: isRecount ? '3px solid #ccc' : '3px solid #000',
                            paddingLeft: '0.4rem',
                          }}>
                            {isRecount ? 'Recontagem' : '1ª Contagem'}
                          </span>
                        </div>

                        {/* Data */}
                        <span style={{ fontSize: '0.75rem', color: '#888', fontWeight: '600', minWidth: '80px' }}>
                          {inv.created_at ? formatDate(inv.created_at) : '—'}
                        </span>

                        {/* Peças */}
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#333' }}>
                          {inv.total_items ?? '—'} peças
                        </span>

                        {/* Divergências */}
                        {hasDiv ? (
                          <span style={{ background: '#000', color: '#fff', padding: '1px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>
                            {inv.divergence_count} div.
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#bbb', fontWeight: '600' }}>sem divergência</span>
                        )}

                        {/* Status */}
                        <StatusBadge status={inv.status} />

                        {/* Ver peças */}
                        <div style={{ marginLeft: 'auto' }}>
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', border: '1px solid #ccc', fontWeight: '700' }}
                            onClick={() => setSelected(inv)}
                          >
                            Ver peças
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {selected && <ModalItens inventory={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
