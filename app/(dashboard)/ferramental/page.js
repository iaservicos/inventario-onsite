'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';

const STATUS_CONFIG = {
  aguardando_aprovacao: { label: 'Aguardando Aprovação', color: '#000', bg: '#f0f0f0' },
  aprovado:             { label: 'Aprovado',             color: '#000', bg: '#e0e0e0' },
  reprovado:            { label: 'Reprovado',            color: '#fff', bg: '#000' },
  aguardando_envio:     { label: 'Aguardando Envio',     color: '#000', bg: '#e8e8e8' },
  enviando:             { label: 'Enviando',             color: '#000', bg: '#d8d8d8' },
  pendente:             { label: 'Pendente',             color: '#000', bg: '#ebebeb' },
  aguardando_compra:    { label: 'Aguardando Compra',    color: '#000', bg: '#e4e4e4' },
  cancelado:            { label: 'Cancelado',            color: '#888', bg: '#f5f5f5' },
  entregue:             { label: 'Entregue',             color: '#fff', bg: '#333' },
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
  const cfg = STATUS_CONFIG[status] || { label: status, color: '#888', bg: '#f0f0f0' };
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

  const fieldStyle = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#fff', border: '1px solid #ccc', color: '#000', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.72rem', color: '#555', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '8px', width: '100%', maxWidth: '500px', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#000' }}>Atualizar Solicitação #{request.id}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Info */}
          <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#555', lineHeight: '1.6' }}>
            <div><strong style={{ color: '#000' }}>{request.technician_name}</strong>{request.technician_email ? ` — ${request.technician_email}` : ''}</div>
            <div style={{ marginTop: '0.2rem', color: '#333', fontWeight: '600' }}>{request.tool_name}</div>
            {request.comment && <div style={{ marginTop: '0.2rem', fontStyle: 'italic', color: '#666' }}>"{request.comment}"</div>}
            {request.delivery_method && (
              <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#444', fontWeight: '600' }}>
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
                      style={{ padding: '0.45rem 0.9rem', borderRadius: '8px', border: `1px solid ${status === t.value ? '#000' : '#ccc'}`, background: status === t.value ? '#000' : 'transparent', color: status === t.value ? '#fff' : '#666', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Método de envio */}
              {showDelivery && (
                <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div>
                    <label style={labelStyle}>Método de Envio *</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {[{ value: 'correio', label: 'Via Correio' }, { value: 'pessoalmente', label: 'Pessoalmente' }].map(m => (
                        <button key={m.value} onClick={() => setDeliveryMethod(m.value)}
                          style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: `1px solid ${deliveryMethod === m.value ? '#000' : '#ccc'}`, background: deliveryMethod === m.value ? '#000' : 'transparent', color: deliveryMethod === m.value ? '#fff' : '#666', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {deliveryMethod === 'correio' && (
                    <div>
                      <label style={labelStyle}>Código de Postagem *</label>
                      <input value={trackingCode} onChange={e => setTrackingCode(e.target.value)} placeholder="Ex: AA123456789BR" style={fieldStyle} />
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
                style={{ width: '100%', padding: '0.85rem', background: saving || !status ? '#e0e0e0' : '#000', color: saving || !status ? '#888' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: saving || !status ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                {saving ? 'SALVANDO...' : 'CONFIRMAR'}
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', color: '#666', fontSize: '0.85rem' }}>
              Nenhuma ação disponível para este status com seu perfil.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalSolicitarTecnico({ onClose, onSaved }) {
  const [technicians, setTechnicians] = useState([]);
  const [tools, setTools]             = useState([]);
  const [techId, setTechId]           = useState('');
  const [selectedTools, setSelectedTools] = useState({});
  const [comment, setComment]         = useState('');
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/technicians').then(r => r.json()),
      fetch('/api/ferramental/tools').then(r => r.json()),
    ]).then(([techs, toolsList]) => {
      setTechnicians(Array.isArray(techs) ? techs : []);
      setTools(Array.isArray(toolsList) ? toolsList : []);
    }).finally(() => setLoading(false));
  }, []);

  function toggleTool(id) {
    setSelectedTools(prev => {
      if (prev[id] !== undefined) { const n = { ...prev }; delete n[id]; return n; }
      return { ...prev, [id]: 1 };
    });
  }
  function setQty(id, v) { setSelectedTools(prev => ({ ...prev, [id]: Math.max(1, parseInt(v) || 1) })); }

  const selectedCount = Object.keys(selectedTools).length;

  async function save() {
    if (!techId)           { toast.error('Selecione o técnico'); return; }
    if (!selectedCount)    { toast.error('Selecione ao menos uma ferramenta'); return; }
    setSaving(true);
    let errors = 0;
    try {
      for (const [toolId, quantity] of Object.entries(selectedTools)) {
        const res = await fetch('/api/ferramental/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ technician_id: parseInt(techId), tool_id: parseInt(toolId), quantity, comment: comment.trim() || null, supervisor_request: true }),
        });
        if (!res.ok) errors++;
      }
      if (errors === 0) { toast.success(`${selectedCount} solicitação(ões) criada(s) com aprovação`); onSaved(); onClose(); }
      else toast.error(`${errors} item(s) com erro`);
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const selectedTech = technicians.find(t => t.id === parseInt(techId));
  const fs = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px', background: '#fff', border: '1px solid #ccc', color: '#000', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };
  const ls = { fontSize: '0.72rem', color: '#555', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#fff', border: '2px solid #000', borderRadius: '8px', width: '100%', maxWidth: '520px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000', background: '#f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '900', color: '#000' }}>Solicitar Ferramentas para Técnico</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', fontSize: '1.2rem', cursor: 'pointer', fontWeight: '900' }}>✕</button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#888', padding: '2rem' }}>Carregando...</div>
          ) : (
            <>
              {/* Técnico */}
              <div>
                <label style={ls}>Técnico *</label>
                <select value={techId} onChange={e => setTechId(e.target.value)} style={{ ...fs, cursor: 'pointer' }}>
                  <option value="">Selecione o técnico</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.region ? ` — ${t.region}` : ''}</option>)}
                </select>
                {selectedTech?.supervisor_name && (
                  <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.3rem' }}>Supervisor: {selectedTech.supervisor_name}</div>
                )}
              </div>

              {/* Ferramentas */}
              <div>
                <label style={ls}>
                  Ferramentas e quantidades *
                  {selectedCount > 0 && <span style={{ marginLeft: '0.4rem', color: '#000', fontWeight: '900' }}>({selectedCount})</span>}
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {tools.map(tool => {
                    const isSelected = selectedTools[tool.id] !== undefined;
                    const qty = selectedTools[tool.id] ?? 1;
                    return (
                      <div key={tool.id} style={{ borderRadius: '8px', border: `1px solid ${isSelected ? '#4a8a4a' : '#e4e4e7'}`, background: isSelected ? '#f0f7f0' : '#fafafa', overflow: 'hidden' }}>
                        <button type="button" onClick={() => toggleTool(tool.id)}
                          style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.6rem 0.85rem', width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                          <div style={{ width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0, background: isSelected ? '#2d6a2d' : 'transparent', border: `2px solid ${isSelected ? '#2d6a2d' : '#ccc'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#fff', fontWeight: '900' }}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? '#1a4a1a' : '#333' }}>{tool.name}</span>
                        </button>
                        {isSelected && (
                          <div style={{ padding: '0 0.85rem 0.6rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }} onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.68rem', color: '#666', fontWeight: '700', textTransform: 'uppercase' }}>Qtd:</span>
                            <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #ccc', borderRadius: '6px', overflow: 'hidden' }}>
                              <button type="button" onClick={() => setQty(tool.id, qty - 1)} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#555', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '700' }}>−</button>
                              <input type="number" min="1" value={qty} onChange={e => setQty(tool.id, e.target.value)}
                                style={{ width: '44px', background: 'transparent', border: 'none', color: '#000', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center', outline: 'none', fontFamily: 'inherit', padding: '0' }} />
                              <button type="button" onClick={() => setQty(tool.id, qty + 1)} style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: '#555', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '700' }}>+</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Observação */}
              <div>
                <label style={ls}>Observação</label>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Motivo da solicitação, urgência, etc." rows={2}
                  style={{ ...fs, resize: 'vertical', minHeight: '64px' }} />
              </div>

              <button onClick={save} disabled={saving || !techId || !selectedCount}
                style={{ width: '100%', padding: '0.85rem', background: saving || !techId || !selectedCount ? '#e0e0e0' : '#000', color: saving || !techId || !selectedCount ? '#888' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: saving || !techId || !selectedCount ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                {saving ? 'ENVIANDO...' : `SOLICITAR${selectedCount > 1 ? ` (${selectedCount})` : ''}`}
              </button>
            </>
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
  const [termosPendentes, setTermosPendentes] = useState([]);
  const [showSolicitar, setShowSolicitar] = useState(false);

  const role = session?.user?.role;
  const isGestor = ['admin', 'supervisor'].includes(role);
  const isAnalista = role === 'analista_custo' || role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.set('status', filterStatus);
      const [res, resTermos] = await Promise.all([
        fetch(`/api/ferramental/requests?${params}`),
        fetch('/api/ferramental/requests?status=entregue'),
      ]);
      const [data, termos] = await Promise.all([res.json(), resTermos.json()]);
      setRequests(Array.isArray(data) ? data : []);
      setTermosPendentes(Array.isArray(termos) ? termos : []);
    } catch { toast.error('Erro ao carregar solicitações'); }
    finally { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  // Termos pendentes agrupados por técnico
  const termosByTech = termosPendentes.reduce((acc, r) => {
    const key = r.technician_name;
    if (!acc[key]) acc[key] = { name: r.technician_name, supervisor: r.technicians?.supervisor_name, tools: [] };
    acc[key].tools.push({ id: r.id, name: r.tool_name, date: r.created_at });
    return acc;
  }, {});
  const termoEntries = Object.values(termosByTech);

  // KPIs
  const total      = requests.length;
  const aguardando = requests.filter(r => r.status === 'aguardando_aprovacao').length;
  const aprovados  = requests.filter(r => r.status === 'aprovado').length;
  const entregues  = termosPendentes.length;

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageHeader
        title="Ferramental"
        subtitle="Controle de solicitações e entrega de ferramentas"
        actions={isGestor && (
          <button
            onClick={() => setShowSolicitar(true)}
            style={{ padding: '0.55rem 1rem', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            + Solicitar para Técnico
          </button>
        )}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: total },
          { label: 'Aguard. Aprovação', value: aguardando },
          { label: 'Aprovados', value: aprovados },
          { label: 'Entregues', value: entregues },
        ].map(kpi => (
          <div key={kpi.label} className="card">
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#000', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#888', fontWeight: '700', marginTop: '0.4rem', textTransform: 'uppercase' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Painel Termos Pendentes */}
      {termoEntries.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: '900', color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚠</span>
            <span>Termos Pendentes no DocSign — {termoEntries.length} técnico{termoEntries.length > 1 ? 's' : ''} / {termosPendentes.length} entrega{termosPendentes.length > 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
            {termoEntries.map(entry => (
              <div key={entry.name} style={{ background: '#ffffff', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.65rem 0.9rem', minWidth: '200px' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#000', marginBottom: '2px' }}>{entry.name}</div>
                {entry.supervisor && (
                  <div style={{ fontSize: '0.68rem', color: '#888', marginBottom: '0.35rem' }}>Sup: {entry.supervisor}</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                  {entry.tools.map(t => (
                    <span key={t.id} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.1rem 0.45rem', fontSize: '0.7rem', fontWeight: '600', color: '#78350f' }}>
                      {t.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', alignItems: 'flex-start' }}>
                          <StatusBadge status={r.status} />
                          {r.status === 'entregue' && (
                            <span style={{ display: 'inline-block', padding: '0.12rem 0.4rem', borderRadius: '4px', fontSize: '0.62rem', fontWeight: '800', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', textTransform: 'uppercase', letterSpacing: '0.03em', whiteSpace: 'nowrap' }}>
                              Falta Termo
                            </span>
                          )}
                        </div>
                      </td>
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

      {showSolicitar && (
        <ModalSolicitarTecnico
          onClose={() => setShowSolicitar(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
