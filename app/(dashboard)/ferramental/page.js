'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';

const STATUS_CONFIG = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#f59e0b', bg: '#2a1f00' },
  aprovado:             { label: 'Aprovado',             color: '#22c55e', bg: '#0a2a0a' },
  reprovado:            { label: 'Reprovado',            color: '#ef4444', bg: '#2a0a0a' },
  aguardando_envio:     { label: 'Aguardando Envio',     color: '#60a5fa', bg: '#0a1a2a' },
  enviando:             { label: 'Enviando',             color: '#a78bfa', bg: '#1a0a2a' },
  pendente:             { label: 'Pendente',             color: '#fb923c', bg: '#2a1200' },
  aguardando_compra:    { label: 'Aguardando Compra',    color: '#f472b6', bg: '#2a0a1a' },
  cancelado:            { label: 'Cancelado',            color: '#6b7280', bg: '#1a1a1a' },
  entregue:             { label: 'Entregue',             color: '#34d399', bg: '#0a2a1a' },
};

const GESTOR_TRANSITIONS = [
  { value: 'aprovado',  label: 'Aprovar' },
  { value: 'reprovado', label: 'Reprovar' },
];

const ANALISTA_TRANSITIONS = [
  { value: 'aguardando_envio',  label: 'Aguardando Envio' },
  { value: 'enviando',          label: 'Enviando' },
  { value: 'pendente',          label: 'Pendente' },
  { value: 'aguardando_compra', label: 'Aguardando Compra' },
  { value: 'entregue',          label: 'Entregue' },
  { value: 'cancelado',         label: 'Cancelar' },
];

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#888888', bg: '#1a1a1a' };
  return (
    <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', color: cfg.color, background: cfg.bg, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function ModalAcao({ request, role, onClose, onUpdated }) {
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [saving, setSaving] = useState(false);

  const isGestor = ['admin', 'supervisor'].includes(role);
  const isAnalista = role === 'analista_custo' || role === 'admin';
  const showDelivery = isAnalista && status === 'enviando';

  const transitions = isGestor && request.status === 'aguardando_aprovacao'
    ? GESTOR_TRANSITIONS
    : isAnalista && ['aprovado', 'aguardando_envio', 'enviando', 'pendente', 'aguardando_compra'].includes(request.status)
    ? ANALISTA_TRANSITIONS
    : [];

  async function save() {
    if (!status) { toast.error('Selecione um status'); return; }
    if (showDelivery && !deliveryMethod) { toast.error('Selecione o método de envio'); return; }
    if (showDelivery && deliveryMethod === 'correio' && !trackingCode.trim()) {
      toast.error('Informe o código de postagem'); return;
    }
    setSaving(true);
    try {
      const body = {
        status,
        approval_notes:  isGestor ? notes || undefined : undefined,
        analyst_notes:   isAnalista && !isGestor ? notes || undefined : undefined,
        delivery_method: showDelivery ? deliveryMethod : undefined,
        tracking_code:   showDelivery && deliveryMethod === 'correio' ? trackingCode.trim() : undefined,
      };
      const res = await fetch(`/api/ferramental/requests/${request.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao salvar'); return; }
      toast.success('Status atualizado');
      onUpdated();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const fieldStyle = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#222222', border: '1px solid #333333', color: '#ffffff', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.72rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#1a1a1a', border: '1px solid #333333', borderRadius: '12px', width: '100%', maxWidth: '500px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #2a2a2a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#ffffff' }}>Atualizar Solicitação #{request.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888888', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Info */}
          <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#aaaaaa', lineHeight: '1.6' }}>
            <div><strong style={{ color: '#ffffff' }}>{request.technician_name}</strong>{request.technician_email ? ` — ${request.technician_email}` : ''}</div>
            <div style={{ marginTop: '0.2rem', color: '#cccccc', fontWeight: '600' }}>{request.tool_name}</div>
            {request.comment && <div style={{ marginTop: '0.2rem', fontStyle: 'italic', color: '#666666' }}>"{request.comment}"</div>}
            {request.delivery_method && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#60a5fa' }}>
                Último envio: {request.delivery_method === 'correio' ? `Correio${request.tracking_code ? ` — ${request.tracking_code}` : ''}` : 'Pessoalmente'}
              </div>
            )}
          </div>

          {transitions.length > 0 ? (
            <>
              {/* Seletor de status */}
              <div>
                <label style={labelStyle}>Novo Status *</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {transitions.map(t => (
                    <button key={t.value} onClick={() => { setStatus(t.value); setDeliveryMethod(''); setTrackingCode(''); }}
                      style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', border: `1px solid ${status === t.value ? '#ffffff' : '#333333'}`, background: status === t.value ? '#ffffff' : 'transparent', color: status === t.value ? '#000000' : '#888888', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de envio — só aparece quando status = enviando */}
              {showDelivery && (
                <div style={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Método de Envio *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[{ value: 'correio', label: 'Via Correio' }, { value: 'pessoalmente', label: 'Pessoalmente' }].map(m => (
                        <button key={m.value} onClick={() => setDeliveryMethod(m.value)}
                          style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1px solid ${deliveryMethod === m.value ? '#60a5fa' : '#333333'}`, background: deliveryMethod === m.value ? '#0a1a2a' : 'transparent', color: deliveryMethod === m.value ? '#60a5fa' : '#888888', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {deliveryMethod === 'correio' && (
                    <div>
                      <label style={labelStyle}>Código de Postagem *</label>
                      <input
                        value={trackingCode}
                        onChange={e => setTrackingCode(e.target.value)}
                        placeholder="Ex: AA123456789BR"
                        style={fieldStyle}
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Observação */}
              <div>
                <label style={labelStyle}>Observação</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional..." rows={2}
                  style={{ ...fieldStyle, resize: 'vertical', minHeight: '64px' }} />
              </div>

              <button onClick={save} disabled={saving || !status}
                style={{ width: '100%', padding: '0.85rem', background: saving || !status ? '#2a2a2a' : '#ffffff', color: saving || !status ? '#555555' : '#000000', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: saving || !status ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                {saving ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666666', fontSize: '0.85rem' }}>
              Nenhuma ação disponível para este status com seu perfil.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ALL_STATUSES = Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: cfg.label }));

export default function FerramentalPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);

  const role = session?.user?.role;
  const isGestor = ['admin', 'supervisor'].includes(role);
  const isAnalista = role === 'analista_custo' || role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const res = await fetch(`/api/ferramental/requests?${params}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar solicitações'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  // KPIs
  const total      = requests.length;
  const aguardando = requests.filter(r => r.status === 'aguardando_aprovacao').length;
  const aprovados  = requests.filter(r => r.status === 'aprovado').length;
  const entregues  = requests.filter(r => r.status === 'entregue').length;

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageHeader title="Ferramental" subtitle="Controle de solicitações e entrega de ferramentas" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: total, color: '#000000' },
          { label: 'Aguard. Aprovação', value: aguardando, color: '#f59e0b' },
          { label: 'Aprovados', value: aprovados, color: '#22c55e' },
          { label: 'Entregues', value: entregues, color: '#34d399' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem', borderTop: `3px solid ${kpi.color}` }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: kpi.color }}>{kpi.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '700', marginTop: '0.25rem', textTransform: 'uppercase' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#888888', textTransform: 'uppercase' }}>Status:</span>
        {[{ value: 'all', label: 'Todos' }, ...ALL_STATUSES].map(opt => (
          <button key={opt.value} onClick={() => setFilterStatus(opt.value)} style={{ padding: '0.35rem 0.85rem', borderRadius: '6px', border: `1px solid ${filterStatus === opt.value ? '#000000' : '#dddddd'}`, background: filterStatus === opt.value ? '#000000' : 'transparent', color: filterStatus === opt.value ? '#ffffff' : '#666666', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.15s' }}>
            {opt.label}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '0.35rem 0.85rem', borderRadius: '6px', border: '1px solid #dddddd', background: 'transparent', color: '#666666', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>Carregando...</div>
        ) : requests.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>Nenhuma solicitação encontrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #eeeeee' }}>
                  {['#', 'Técnico', 'E-mail', 'Ferramenta', 'Comentário', 'Status', 'Criado em', 'Ação'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r, idx) => {
                  const canAct =
                    (isGestor && r.status === 'aguardando_aprovacao') ||
                    (isAnalista && ['aprovado', 'aguardando_envio', 'enviando', 'pendente', 'aguardando_compra'].includes(r.status));
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#999999', fontWeight: '700' }}>#{r.id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '700', color: '#000000', whiteSpace: 'nowrap' }}>
                        {r.technician_name}
                        {r.technicians?.supervisor_name && (
                          <div style={{ fontSize: '0.68rem', color: '#999999', fontWeight: '500' }}>
                            Sup: {r.technicians.supervisor_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#555555' }}>{r.technician_email || '—'}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#222222', maxWidth: '180px' }}>{r.tool_name}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#777777', maxWidth: '200px', fontStyle: r.comment ? 'italic' : 'normal' }}>
                        {r.comment ? `"${r.comment}"` : '—'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusBadge status={r.status} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#888888', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        {canAct ? (
                          <button onClick={() => setSelected(r)} style={{ padding: '0.35rem 0.75rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
                            Atualizar
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#cccccc' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <ModalAcao
          request={selected}
          role={role}
          onClose={() => setSelected(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
