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
  { value: 'recount_pending', label: 'Aguarda recontagem' },
  { value: 'cancelled', label: 'Cancelado' },
];

/* Retorna a fase do ciclo baseado nos dados do inventário */
function getFaseLabel(inv) {
  if (inv.status === 'recount_pending') {
    return { text: '1ª Contagem → aguarda recon.', accent: '#888' };
  }
  if (inv.is_recount === true) {
    return { text: 'Com recontagem', accent: '#555' };
  }
  if (inv.is_recount === false) {
    return { text: '1ª Contagem', accent: '#000' };
  }
  // is_recount ainda não existe no banco
  return { text: '—', accent: '#ccc' };
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
function ModalItens({ inventory, onClose }) {
  const [rawItems, setRawItems] = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch(`/api/inventories/${inventory.id}/items`)
      .then(r => r.json())
      .then(data => { setRawItems(Array.isArray(data) ? data : []); setLoading(false); });
  }, [inventory.id]);

  // Deduplica por código normalizado, mantendo o registro mais recente (counted_at)
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
    return Object.values(map).sort((a, b) => {
      // Divergências primeiro, depois agendados, depois ok
      const scoreA = a.has_divergence ? 2 : a.physical_qty === null ? 1 : 0;
      const scoreB = b.has_divergence ? 2 : b.physical_qty === null ? 1 : 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (a.item_name || '').localeCompare(b.item_name || '', 'pt-BR');
    });
  }, [rawItems]);

  const total   = items.length;
  const ok      = items.filter(i => !i.has_divergence && i.physical_qty !== null).length;
  const diverg  = items.filter(i => i.has_divergence).length;
  const pending = items.filter(i => i.physical_qty === null).length;
  const fase    = getFaseLabel(inventory);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '860px', maxHeight: '90vh', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: '900', fontSize: '0.95rem', color: '#000', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {inventory.technicians?.name}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Semana {inventory.week_ref} &nbsp;·&nbsp; {inventory.technicians?.region}
              {inventory.inventory_schedules?.[0]?.scheduled_subgroup && (
                <> &nbsp;·&nbsp; {inventory.inventory_schedules[0].scheduled_subgroup}</>
              )}
              <span style={{ background: '#000', color: '#fff', borderRadius: '3px', padding: '1px 6px', fontSize: '0.62rem', fontWeight: '800' }}>
                {fase.text}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900', color: '#000' }}>✕</button>
        </div>

        {/* KPIs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e4e4e7' }}>
          {[
            { label: 'Total',        value: total   },
            { label: 'OK',           value: ok      },
            { label: 'Divergências', value: diverg  },
            { label: 'Pendentes',    value: pending },
          ].map((k, i) => (
            <div key={i} style={{ flex: 1, padding: '0.75rem', textAlign: 'center', borderRight: i < 3 ? '1px solid #e4e4e7' : 'none' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#000' }}>{loading ? '—' : k.value}</div>
              <div style={{ fontSize: '0.6rem', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginTop: '1px' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Tabela de itens */}
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
                    <th key={h} style={{ padding: '0.55rem 0.75rem', textAlign: 'left', fontWeight: '800', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#888' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const diff    = item.physical_qty !== null ? Number(item.physical_qty) - Number(item.system_qty) : null;
                  const isPend  = item.physical_qty === null;
                  return (
                    <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '0.55rem 0.75rem' }}>
                        <code style={{ fontSize: '0.72rem', background: '#f5f5f5', padding: '2px 5px', borderRadius: '3px', border: '1px solid #eee' }}>{item.item_code}</code>
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: '700', color: '#000' }}>{item.item_name}</td>
                      <td style={{ padding: '0.55rem 0.75rem', color: '#666', fontSize: '0.75rem' }}>{item.item_subgroup || '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', color: '#666' }}>{item.system_qty ?? '—'}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '700', color: isPend ? '#888' : '#000' }}>{isPend ? '—' : item.physical_qty}</td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'right', fontWeight: '800' }}>
                        {diff === null ? '—' : diff > 0 ? `+${diff}` : diff === 0 ? '✓' : diff}
                      </td>
                      <td style={{ padding: '0.55rem 0.75rem', textAlign: 'center' }}>
                        <StatusBadge status={isPend ? 'pending' : item.has_divergence ? 'recount' : 'counted'} />
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

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Histórico de Inventário"
        subtitle="Log de contagens por técnico"
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
                {inventories.map(inv => {
                  const sched = inv.inventory_schedules?.[0];
                  const fase  = getFaseLabel(inv);
                  const hasDiv = (inv.divergence_count || 0) > 0;
                  return (
                    <tr key={inv.id}>
                      <td style={{ fontWeight: '800', color: '#000' }}>{inv.technicians?.name || '—'}</td>
                      <td style={{ color: '#666', fontSize: '0.8rem' }}>{inv.technicians?.region || '—'}</td>
                      <td style={{ fontWeight: '700' }}>{inv.week_ref || '—'}</td>
                      <td style={{ color: '#666', fontSize: '0.8rem' }}>{sched?.scheduled_subgroup || '—'}</td>
                      <td>
                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: fase.accent, borderLeft: `3px solid ${fase.accent}`, paddingLeft: '0.4rem' }}>
                          {fase.text}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700', color: '#333' }}>{inv.total_items ?? '—'}</td>
                      <td style={{ textAlign: 'center', fontWeight: '800' }}>
                        {hasDiv
                          ? <span style={{ background: '#000', color: '#fff', padding: '1px 7px', borderRadius: '4px', fontSize: '0.72rem' }}>{inv.divergence_count}</span>
                          : <span style={{ color: '#ccc', fontSize: '0.75rem' }}>0</span>}
                      </td>
                      <td><StatusBadge status={inv.status} /></td>
                      <td style={{ color: '#888', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{formatDateOnly(inv.created_at)}</td>
                      <td>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', border: '1px solid #ccc', fontWeight: '700', whiteSpace: 'nowrap' }}
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

      {selected && <ModalItens inventory={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
