'use client';

import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const DIV_STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'open', label: 'Aberta' },
  { value: 'recount', label: 'Recontagem' },
  { value: 'tratativa', label: 'Em Tratativa' },
  { value: 'validated', label: 'Validada' },
  { value: 'adjusted', label: 'Ajustada' },
];

function ModalTratativa({ divergencia, onClose, onSaved }) {
  const [ticket, setTicket] = useState(divergencia?.ticket_number || '');
  const [note, setNote]     = useState(divergencia?.ticket_note   || '');
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/divergences/${divergencia.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'tratativa', ticket_number: ticket.trim(), ticket_note: note.trim() }),
      });
      if (!res.ok) throw new Error();
      onSaved();
    } catch {
      toast.error('Erro ao salvar tratativa');
    }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--color-bg-primary)', width: '100%', maxWidth: '480px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--color-text-primary)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--color-text-primary)', background: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', fontSize: '0.95rem', textTransform: 'uppercase' }}>Em Tratativa</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900' }}>✕</button>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: 'var(--color-bg-tertiary)', borderBottom: '1px solid var(--color-border-light)', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          <div style={{ fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '2px' }}>{divergencia.item_name}</div>
          <div style={{ color: 'var(--color-text-tertiary)' }}>
            Técnico: <strong>{divergencia.technicians?.name}</strong> &nbsp;|&nbsp;
            Diferença: <strong style={{ color: 'var(--color-text-primary)' }}>{divergencia.difference}</strong>
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Número do Chamado GLPI (opcional)
            </label>
            <input
              type="text"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Ex: INC0012345"
              autoFocus
              className="input"
              style={{ border: '1px solid var(--color-text-primary)', borderRadius: '4px', fontWeight: '600', width: '100%' }}
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Observação (opcional)
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Descreva a ação em andamento..."
              rows={3}
              className="input"
              style={{ border: '1px solid var(--color-text-primary)', borderRadius: '4px', fontWeight: '600', width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid var(--color-border-light)' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'var(--color-text-primary)', border: 'none', fontWeight: '900' }}>
              {saving ? 'Salvando...' : 'Confirmar Tratativa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DivergenciasPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '', supervisor: '' });
  const [technicians, setTechnicians] = useState([]);
  const [divergences, setDivergences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [tratativaModal, setTratativaModal] = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then(setTechnicians);
  }, []);

  const supervisors = [...new Set(
    technicians.filter(t => t.supervisor_name).map(t => t.supervisor_name)
  )].sort();

  const load = useCallback(async () => {
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
    const res = await fetch(`/api/divergences?${params}`);
    const raw = await res.json();
    const all = Array.isArray(raw) ? raw : [];

    const latestMap = {};
    for (const d of all) {
      if ((d.system_qty || 0) === 0) continue;

      const invStatus    = d.inventories?.status;
      const invIsRecount = d.inventories?.is_recount;

      if (invStatus === 'recount_pending') continue;
      if (invIsRecount === true && d.is_recount !== true) continue;

      const key = `${d.inventory_id}|${d.item_code}`;
      if (!latestMap[key] || new Date(d.created_at) > new Date(latestMap[key].created_at)) {
        latestMap[key] = d;
      }
    }
    const deduplicated = Object.values(latestMap);

    setDivergences(
      filters.status ? deduplicated.filter(d => d.status === filters.status) : deduplicated
    );
    setLoading(false);
  }, [filters]);

  useEffect(() => { load(); }, [load]);


  async function exportExcel() {
    setExporting(true);
    try {
      const rows = divergences.map((d) => ({
        'Técnico':       d.technicians?.name || '',
        'Região':        d.technicians?.region || '',
        'Semana':        d.inventories?.week_ref || '',
        'Código Item':   d.item_code,
        'Item':          d.item_name,
        'Qtd. Sistema':  d.system_qty,
        'Qtd. Física':   d.physical_qty,
        'Diferença':     d.difference,

        'Status':        { open: 'Aberta', recount: 'Recontagem', tratativa: 'Em Tratativa', validated: 'Validada', adjusted: 'Ajustada' }[d.status] || d.status,
        'Chamado':       d.ticket_number || '',
        'Obs. Tratativa': d.ticket_note || '',
        'Data':          d.created_at ? new Date(d.created_at).toLocaleString('pt-BR') : '',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Divergências');
      ws['!cols'] = [18, 12, 10, 12, 25, 12, 12, 10, 12, 12, 18].map((w) => ({ wch: w }));
      XLSX.writeFile(wb, `relatorio-divergencias-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Relatório exportado!');
    } catch {
      toast.error('Erro ao exportar');
    }
    setExporting(false);
  }


  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%', background: 'var(--color-bg-primary)' }}>
      <PageHeader
        title="Divergências"
        subtitle="Comparativo entre estoque físico e sistema"
        actions={
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting} style={{ borderRadius: '8px', transition: '0.2s' }}>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} supervisors={supervisors} statusOptions={DIV_STATUS_OPTIONS} />

      <div style={{ height: '1.5rem' }} />

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
            <div className="table-wrapper" style={{ border: 'none' }}>
              {divergences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: 'var(--color-text-tertiary)' }}>Nenhuma divergência encontrada</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>Semana</th>
                      <th>Código</th>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Sistema</th>
                      <th style={{ textAlign: 'right' }}>Físico</th>
                      <th style={{ textAlign: 'right' }}>Diferença</th>
                      <th>Status</th>
                      <th>Chamado</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {divergences.map((d) => {
                      const pct        = Number(d.percentage_diff);
                      const isCritical = pct >= 30;
                      return (
                        <tr key={d.id}>
                          <td style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>{d.technicians?.name}</td>
                          <td style={{ color: 'var(--color-text-tertiary)', fontWeight: '600' }}>{d.inventories?.week_ref || '—'}</td>
                          <td>
                            <code style={{ fontSize: '0.75rem', background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border-light)' }}>
                              {d.item_code}
                            </code>
                          </td>
                          <td style={{ fontWeight: '600' }}>{d.item_name}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{d.system_qty}</td>
                          <td style={{ textAlign: 'right', color: 'var(--color-text-tertiary)' }}>{d.physical_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: Number(d.difference) < 0 ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                            {Number(d.difference) > 0 ? '+' : ''}{d.difference}
                          </td>
                          <td><StatusBadge status={d.status} /></td>
                          <td>
                            {d.ticket_number ? (
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>{d.ticket_number}</div>
                                {d.ticket_note && <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '1px' }}>{d.ticket_note}</div>}
                              </div>
                            ) : <span style={{ color: 'var(--color-border-light)', fontSize: '0.75rem' }}>—</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {(d.status === 'open' || d.status === 'recount') && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', border: 'none' }}
                                  onClick={() => setTratativaModal(d)}
                                >
                                  Em Tratativa
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {tratativaModal && (
        <ModalTratativa
          divergencia={tratativaModal}
          onClose={() => setTratativaModal(null)}
          onSaved={() => { setTratativaModal(null); toast.success('Tratativa registrada!'); load(); }}
        />
      )}
    </div>
  );
}
