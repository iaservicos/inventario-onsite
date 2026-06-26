'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterBar from '@/components/ui/FilterBar';
import { formatDate } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'in_progress', label: 'Em andamento' },
  { value: 'completed', label: 'Concluído' },
  { value: 'recount_pending', label: 'Aguarda recontagem' },
  { value: 'cancelled', label: 'Cancelado' },
];

/* Retorna a fase do ciclo baseado nos dados do inventário */
function getFaseLabel(inv) {
  if (inv.status === 'recount_pending') {
    return { text: '1ª Contagem → aguarda recon.', accent: 'var(--color-text-tertiary)' };
  }
  if (inv.is_recount === true) {
    return { text: 'Com recontagem', accent: 'var(--color-text-secondary)' };
  }
  if (inv.is_recount === false) {
    return { text: '1ª Contagem', accent: 'var(--color-text-primary)' };
  }
  return { text: '—', accent: 'var(--color-border-light)' };
}

function formatDateOnly(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

/* Remove zeros à esquerda para normalizar código */
function normalizeCode(code) {
  return String(code || '').replace(/^0+/, '') || '0';
}

/* ─── Modal: peças de um inventário ──────────────────────────────────────── */
function ModalItens({ inventory, phase, onClose }) {
  const [rawItems, setRawItems]   = useState([]);
  const [rawDivs,  setRawDivs]    = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchItems = fetch(`/api/inventories/${inventory.id}/items`).then(r => r.json());
    const fetchDivs = phase === 'first'
      ? fetch(`/api/divergences?inventoryId=${inventory.id}`).then(r => r.json())
      : Promise.resolve([]);

    Promise.all([fetchItems, fetchDivs]).then(([items, divs]) => {
      setRawItems(Array.isArray(items) ? items : []);
      setRawDivs(Array.isArray(divs) ? divs : []);
      setLoading(false);
    });
  }, [inventory.id, phase]);

  const firstCountDivMap = useMemo(() => {
    if (phase !== 'first') return {};
    const map = {};
    rawDivs.filter(d => !d.is_recount).forEach(d => {
      map[normalizeCode(d.item_code)] = d;
    });
    return map;
  }, [rawDivs, phase]);

  const items = useMemo(() => {
    const map = {};
    rawItems.forEach(item => {
      const key = normalizeCode(item.item_code);
      const prev = map[key];
      const currDate = new Date(item.counted_at || 0).getTime();
      const prevDate = prev ? new Date(prev.counted_at || 0).getTime() : -1;
      if (!prev || currDate > prevDate) {
        map[key] = item;
      }
    });
    return Object.values(map).map(item => {
      if (phase !== 'first') return item;
      const div = firstCountDivMap[normalizeCode(item.item_code)];
      if (!div) return item;
      return {
        ...item,
        physical_qty:   div.physical_qty,
        system_qty:     div.system_qty,
        has_divergence: true,
        _from_div:      true,
      };
    }).sort((a, b) => {
      const scoreA = a.has_divergence ? 2 : a.physical_qty === null ? 1 : 0;
      const scoreB = b.has_divergence ? 2 : b.physical_qty === null ? 1 : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.item_name || '').localeCompare(b.item_name || '', 'pt-BR');
    });
  }, [rawItems, firstCountDivMap, phase]);

  const sumQty = (arr) => arr.reduce((s, i) => s + (Number(i.system_qty) || 0), 0);
  const total   = sumQty(items);
  const ok      = items
    .filter(i => i.physical_qty !== null)
    .reduce((s, i) => s + Math.min(Number(i.physical_qty) || 0, Number(i.system_qty) || 0), 0);
  const diverg  = items
    .filter(i => i.has_divergence)
    .reduce((s, i) => s + Math.abs((Number(i.physical_qty) || 0) - (Number(i.system_qty) || 0)), 0);
  const pending = sumQty(items.filter(i => i.physical_qty === null));
  const fase    = getFaseLabel(inventory);
  const faseLabel = phase === 'first' ? '1ª Contagem' : phase === 'recount' ? 'Recontagem' : fase.text;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--color-bg-primary)', width: '100%', maxWidth: '860px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--color-text-primary)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--color-text-primary)', background: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {inventory.technicians?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '2px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Semana {inventory.week_ref} &nbsp;·&nbsp; {inventory.technicians?.region}
              {inventory.inventory_schedules?.[0]?.scheduled_subgroup && (
                <> &nbsp;·&nbsp; {inventory.inventory_schedules[0].scheduled_subgroup}</>
              )}
              <span style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', borderRadius: '3px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: '800' }}>
                {faseLabel}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900', color: 'var(--color-text-primary)' }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border-light)' }}>
          {[
            { label: 'Unidades',     value: total   },
            { label: 'OK',           value: ok      },
            { label: 'Divergências', value: diverg  },
            { label: 'Pendentes',    value: pending },
          ].map((k, i) => (
            <div key={i} style={{ flex: 1, padding: '0.75rem', textAlign: 'center', borderRight: i < 3 ? '1px solid var(--color-border-light)' : 'none' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--color-text-primary)' }}>{loading ? '—' : k.value}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginTop: '1px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela de itens */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Carregando peças...</div>
          ) : items.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Nenhuma peça registrada</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-light)' }}>
                  {['Código', 'Item', 'Subgrupo', 'Sistema', 'Físico', 'Diferença', 'Status'].map(h => (
                    <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-tertiary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff    = item.physical_qty !== null ? Number(item.physical_qty) - Number(item.system_qty) : null;
                  const isPend  = item.physical_qty === null;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <code style={{ fontSize: '0.72rem', background: 'var(--color-bg-tertiary)', padding: '2px 5px', borderRadius: '3px', border: '1px solid var(--color-border-light)' }}>{item.item_code}</code>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{item.item_name}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>{item.item_subgroup || '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{item.system_qty ?? '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '700', color: isPend ? 'var(--color-text-tertiary)' : 'var(--color-text-primary)' }}>{isPend ? '—' : item.physical_qty}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '800' }}>
                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff === 0 ? '0' : diff}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        {isPend ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: '700', color: 'var(--color-text-tertiary)', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border-light)', borderRadius: '8px', padding: '2px 7px' }}>PENDENTE</span>
                        ) : item.has_divergence ? (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--color-bg-primary)', background: 'var(--color-text-primary)', borderRadius: '8px', padding: '2px 7px' }}>DIVERGENTE</span>
                        ) : (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--color-success)', background: 'var(--color-success)', borderRadius: '8px', padding: '2px 7px', opacity: 0.2 }}>OK</span>
                        )}
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

  const rows = useMemo(() =>
    inventories.flatMap(inv => {
      if (inv.is_recount === true) {
        return [
          { ...inv, _rowPhase: 'first' },
          { ...inv, _rowPhase: 'recount' },
        ];
      }
      return [{ ...inv, _rowPhase: null }];
    }),
    [inventories]
  );

  useEffect(() => { load(); }, [load]);

  return (
    <DashboardLayout title="Histórico de Inventário" subtitle="Log de contagens por técnico">
      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} statusOptions={STATUS_OPTIONS} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700', color: 'var(--color-text-tertiary)' }}>Carregando...</div>
      ) : inventories.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: 'var(--color-text-tertiary)' }}>Nenhum inventário encontrado</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>UF</th>
                  <th>Semana</th>
                  <th>Subgrupo</th>
                  <th>Fase</th>
                  <th style={{ textAlign: 'center' }}>Peças</th>
                  <th style={{ textAlign: 'center' }}>Div.</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(inv => {
                  const sched      = inv.inventory_schedules?.[0];
                  const isFirst    = inv._rowPhase === 'first';
                  const isRecount  = inv._rowPhase === 'recount';

                  const faseText   = isFirst   ? '1ª Contagem'
                                   : isRecount ? 'Recontagem'
                                   : getFaseLabel(inv).text;
                  const faseAccent = isFirst   ? '#aaa'
                                   : isRecount ? 'var(--color-text-primary)'
                                   : getFaseLabel(inv).accent;

                  const displayStatus = isFirst ? 'recount_pending' : inv.status;

                  const displayDate = isFirst
                    ? formatDateOnly(sched?.scheduled_at || inv.created_at)
                    : formatDateOnly(inv.updated_at || inv.created_at);

                  let displayPecas, divQty;
                  if (isFirst) {
                    displayPecas = inv.total_items ?? '—';
                    divQty = inv.first_count_divergence_quantity ?? null;
                  } else {
                    const rawPecas = (inv.status === 'pending' || !inv.total_quantity)
                      ? (sched?.items_count ?? inv.total_items)
                      : inv.total_quantity;
                    displayPecas = rawPecas ?? '—';
                    divQty = inv.divergence_quantity ?? inv.divergence_count ?? 0;
                  }
                  const hasDiv = divQty !== null && divQty > 0;

                  return (
                    <tr
                      key={`${inv.id}-${inv._rowPhase || 'main'}`}
                      style={{
                        background:    isFirst ? 'var(--color-bg-tertiary)' : undefined,
                        borderBottom:  isFirst ? '1px dashed var(--color-border-light)' : '1px solid var(--color-border-light)',
                        opacity:       isFirst ? 0.75 : 1,
                      }}
                    >
                      <td style={{ fontWeight: '800', color: 'var(--color-text-primary)', paddingLeft: isRecount ? '1.5rem' : undefined }}>
                        {inv.technicians?.name || '—'}
                      </td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{inv.technicians?.region || '—'}</td>
                      <td style={{ fontWeight: '700' }}>{inv.week_ref || '—'}</td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{sched?.scheduled_subgroup || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: faseAccent, borderLeft: `3px solid ${faseAccent}`, paddingLeft: '0.4rem' }}>
                          {faseText}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-text-secondary)' }}>{displayPecas}</td>
                      <td style={{ textAlign: 'center', fontWeight: '800' }}>
                        {divQty === null
                          ? <span style={{ color: 'var(--color-border-light)', fontSize: '0.75rem' }}>—</span>
                          : hasDiv
                            ? <span style={{ background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', padding: '1px 7px', borderRadius: '8px', fontSize: '0.72rem' }}>{divQty}</span>
                            : <span style={{ color: 'var(--color-border-light)', fontSize: '0.75rem' }}>0</span>
                        }
                      </td>
                      <td><StatusBadge status={displayStatus} /></td>
                      <td style={{ color: 'var(--color-text-tertiary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{displayDate}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', border: '1px solid var(--color-border-light)', fontWeight: '700', whiteSpace: 'nowrap' }}
                          onClick={() => setSelected({ inv, phase: isFirst ? 'first' : isRecount ? 'recount' : null })}
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

      {selected && <ModalItens inventory={selected.inv} phase={selected.phase} onClose={() => setSelected(null)} />}
    </DashboardLayout>
  );
}
