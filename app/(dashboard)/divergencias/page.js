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
    if (!ticket.trim()) return;
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', width: '100%', maxWidth: '480px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '900', fontSize: '0.95rem', textTransform: 'uppercase' }}>Em Tratativa</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900' }}>✕</button>
        </div>

        <div style={{ padding: '1rem 1.5rem', background: '#fafafa', borderBottom: '1px solid #eee', fontSize: '0.8rem', color: '#444' }}>
          <div style={{ fontWeight: '800', color: '#000', marginBottom: '2px' }}>{divergencia.item_name}</div>
          <div style={{ color: '#666' }}>
            Técnico: <strong>{divergencia.technicians?.name}</strong> &nbsp;|&nbsp;
            Diferença: <strong style={{ color: '#000' }}>{divergencia.difference}</strong>
          </div>
        </div>

        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              Número do Chamado *
            </label>
            <input
              type="text"
              value={ticket}
              onChange={e => setTicket(e.target.value)}
              placeholder="Ex: INC0012345"
              required
              autoFocus
              className="input"
              style={{ border: '1px solid #000', borderRadius: '4px', fontWeight: '600', width: '100%' }}
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
              style={{ border: '1px solid #000', borderRadius: '4px', fontWeight: '600', width: '100%', resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid #e4e4e7' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving || !ticket.trim()} style={{ background: '#000', border: 'none', fontWeight: '900' }}>
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
    const json = await res.json();
    setDivergences(json);
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
        'Variação (%)':  d.percentage_diff,
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

  const critical   = divergences.filter((d) => Math.abs(d.percentage_diff) >= 30).length;
  const tratativas = divergences.filter((d) => d.status === 'tratativa').length;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Divergências"
        subtitle="Comparativo entre estoque físico e sistema"
        actions={
          <button className="btn btn-secondary" onClick={exportExcel} disabled={exporting}>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <KpiCard label="Total"         value={divergences.length}                                              alert={divergences.length > 0} />
            <KpiCard label="Críticas ≥30%" value={critical}                                                      alert={critical > 0} />
            <KpiCard label="Abertas"       value={divergences.filter((d) => d.status === 'open').length}          alert />
            <KpiCard label="Recontagem"    value={divergences.filter((d) => d.status === 'recount').length} />
            <KpiCard label="Em Tratativa"  value={tratativas}                                                     alert={tratativas > 0} />
            <KpiCard label="Validadas"     value={divergences.filter((d) => d.status === 'validated').length} />
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none' }}>
              {divergences.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem', fontWeight: '700', color: '#888' }}>Nenhuma divergência encontrada</div>
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
                      <th style={{ textAlign: 'right' }}>Variação</th>
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
                          <td style={{ fontWeight: '800', color: '#000' }}>{d.technicians?.name}</td>
                          <td style={{ color: '#666', fontWeight: '600' }}>{d.inventories?.week_ref || '—'}</td>
                          <td>
                            <code style={{ fontSize: '0.75rem', background: '#f5f5f5', padding: '2px 6px', borderRadius: '4px', border: '1px solid #eee' }}>
                              {d.item_code}
                            </code>
                          </td>
                          <td style={{ fontWeight: '600' }}>{d.item_name}</td>
                          <td style={{ textAlign: 'right', color: '#666' }}>{d.system_qty}</td>
                          <td style={{ textAlign: 'right', color: '#666' }}>{d.physical_qty}</td>
                          <td style={{ textAlign: 'right', fontWeight: '800', color: Number(d.difference) < 0 ? '#000' : '#555' }}>
                            {Number(d.difference) > 0 ? '+' : ''}{d.difference}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: '800',
                              fontSize: '0.8rem',
                              color: isCritical ? '#fff' : '#000',
                              background: isCritical ? '#000' : 'transparent',
                              padding: isCritical ? '1px 6px' : '0',
                              borderRadius: '4px',
                            }}>
                              {pct.toFixed(1)}%
                            </span>
                          </td>
                          <td><StatusBadge status={d.status} /></td>
                          <td>
                            {d.ticket_number ? (
                              <div>
                                <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#000' }}>{d.ticket_number}</div>
                                {d.ticket_note && <div style={{ fontSize: '0.65rem', color: '#666', marginTop: '1px' }}>{d.ticket_note}</div>}
                              </div>
                            ) : <span style={{ color: '#ccc', fontSize: '0.75rem' }}>—</span>}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                              {(d.status === 'open' || d.status === 'recount') && (
                                <button
                                  className="btn btn-secondary"
                                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#000', color: '#fff', border: 'none' }}
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

function KpiCard({ label, value, alert: isAlert }) {
  return (
    <div className="card" style={{
      border: `1px solid ${isAlert && value > 0 ? '#000' : '#e8e8e8'}`,
      background: isAlert && value > 0 ? '#000' : '#fff',
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: isAlert && value > 0 ? '#fff' : '#888', marginBottom: '0.4rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: isAlert && value > 0 ? '#fff' : '#000', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
