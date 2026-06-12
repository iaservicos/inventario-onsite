'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';

// ── Configuração de status ────────────────────────────────────
const STATUS_CFG = {
  aguardando_validacao: { label: 'Aguard. Validação', color: '#f59e0b', bg: '#fef3c7' },
  em_validacao:         { label: 'Em Validação',      color: '#60a5fa', bg: '#dbeafe' },
  concluido:            { label: 'Concluído',          color: '#10b981', bg: '#d1fae5' },
  com_divergencia:      { label: 'Com Divergência',    color: '#ef4444', bg: '#fee2e2' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#888', bg: '#f3f4f6' };
  return <span style={{ padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '800', color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>{cfg.label}</span>;
}

// ── Modal: Novo Desligamento (Gestor) ─────────────────────────
function ModalNovoDesligamento({ onClose, onSaved }) {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [toolInventory, setToolInventory] = useState([]);
  const [returnedQtys, setReturnedQtys] = useState({});
  const [notes, setNotes] = useState('');
  const [loadingTech, setLoadingTech] = useState(true);
  const [loadingInv, setLoadingInv] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/technicians')
      .then(r => r.json())
      .then(d => setTechnicians((d || []).filter(t => t.active !== false)))
      .finally(() => setLoadingTech(false));
  }, []);

  useEffect(() => {
    if (!selectedTech) { setToolInventory([]); setReturnedQtys({}); return; }
    setLoadingInv(true);
    fetch(`/api/ferramental/technician-inventory?technician_id=${selectedTech}`)
      .then(r => r.json())
      .then(d => {
        const inv = (d || []).filter(i => i.quantity > 0);
        setToolInventory(inv);
        const qtys = {};
        inv.forEach(i => { qtys[i.tool_id] = i.quantity; });
        setReturnedQtys(qtys);
      })
      .finally(() => setLoadingInv(false));
  }, [selectedTech]);

  async function save() {
    const tech = technicians.find(t => t.id === parseInt(selectedTech));
    if (!tech) { toast.error('Selecione um técnico'); return; }
    const itens = toolInventory.map(i => ({
      tool_id:           i.tool_id,
      tool_name:         i.tool_name,
      tool_notes:        i.tool_notes || null,
      expected_quantity: i.quantity,
      returned_quantity: returnedQtys[i.tool_id] ?? i.quantity,
    }));
    if (!itens.length) { toast.error('Este técnico não tem ferramentas registradas'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/ferramental/desligamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: tech.id, technician_name: tech.name, itens, notes: notes.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      toast.success('Desligamento registrado — aguardando validação da analista');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const inputSt = { padding: '0.55rem 0.75rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', width: '100%' };
  const labelSt = { fontSize: '0.7rem', fontWeight: '800', color: '#555', textTransform: 'uppercase', display: 'block', marginBottom: '0.35rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '620px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #eeeeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#000' }}>Registrar Desligamento</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>Informe as ferramentas devolvidas pelo técnico</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Seleção do técnico */}
          <div>
            <label style={labelSt}>Técnico desligado *</label>
            {loadingTech ? <div style={{ ...inputSt, color: '#aaa' }}>Carregando...</div> : (
              <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                <option value="">— Selecione o técnico —</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}{t.supervisor_name ? ` (${t.supervisor_name})` : ''}</option>)}
              </select>
            )}
          </div>

          {/* Ferramentas do técnico */}
          {selectedTech && (
            loadingInv ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#aaa', fontSize: '0.82rem' }}>Carregando ferramentas...</div>
            ) : toolInventory.length === 0 ? (
              <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '1rem', fontSize: '0.82rem', color: '#92400e', fontWeight: '600' }}>
                ⚠ Nenhuma ferramenta registrada para este técnico.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#555', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Ferramentas — informe a quantidade devolvida
                </div>
                <div style={{ border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Ferramenta</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: '0.68rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Em Posse</th>
                        <th style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontSize: '0.68rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>Devolvido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toolInventory.map((item, i) => {
                        const ret = returnedQtys[item.tool_id] ?? item.quantity;
                        const diverge = ret < item.quantity;
                        return (
                          <tr key={item.tool_id} style={{ borderTop: i > 0 ? '1px solid #f0f0f0' : 'none', background: diverge ? '#fffbeb' : '#fff' }}>
                            <td style={{ padding: '0.7rem 1rem' }}>
                              <div style={{ fontWeight: '700', color: '#111' }}>{item.tool_name}</div>
                              {item.tool_notes && <div style={{ fontSize: '0.68rem', color: '#f59e0b', marginTop: '0.1rem' }}>⚠ {item.tool_notes}</div>}
                            </td>
                            <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#666' }}>{item.quantity}</td>
                            <td style={{ padding: '0.7rem 0.75rem', textAlign: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                                <button onClick={() => setReturnedQtys(p => ({ ...p, [item.tool_id]: Math.max(0, (p[item.tool_id] ?? item.quantity) - 1) }))}
                                  style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}>−</button>
                                <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: '800', color: diverge ? '#ef4444' : '#22c55e' }}>{ret}</span>
                                <button onClick={() => setReturnedQtys(p => ({ ...p, [item.tool_id]: Math.min(item.quantity, (p[item.tool_id] ?? item.quantity) + 1) }))}
                                  style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.9rem' }}>+</button>
                              </div>
                              {diverge && <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '700', marginTop: '0.2rem' }}>falta {item.quantity - ret}</div>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* Observações */}
          <div>
            <label style={labelSt}>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opcional..."
              style={{ ...inputSt, resize: 'vertical' }} />
          </div>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #eeeeee', background: '#f9fafb' }}>
          <button onClick={save} disabled={saving || !selectedTech || toolInventory.length === 0}
            style={{ width: '100%', padding: '0.85rem', background: saving || !selectedTech ? '#e5e7eb' : '#000', color: saving || !selectedTech ? '#9ca3af' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: saving || !selectedTech ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
            {saving ? 'REGISTRANDO...' : 'REGISTRAR DEVOLUÇÃO'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Validação da Analista ──────────────────────────────
function ModalValidacao({ desligamento, onClose, onSaved }) {
  const [branches, setBranches] = useState([]);
  const [validacoes, setValidacoes] = useState(
    (desligamento.ferramental_devolucoes || []).map(d => ({
      devolucao_id:       d.id,
      tool_name:          d.tool_name,
      tool_notes:         d.tool_notes,
      expected_quantity:  d.expected_quantity,
      returned_quantity:  d.returned_quantity,
      validated_quantity: d.validated_quantity ?? d.returned_quantity,
      destination_branch: d.destination_branch || '',
      divergence_notes:   d.divergence_notes || '',
      current_status:     d.status,
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/ferramental/central-stock')
      .then(r => r.json())
      .then(data => {
        const set = new Set();
        (data || []).forEach(t => t.branches?.forEach(b => set.add(b.branch_name)));
        setBranches([...set].sort());
      });
  }, []);

  function update(idx, field, value) {
    setValidacoes(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  async function save() {
    const missing = validacoes.filter(v => v.validated_quantity > 0 && !v.destination_branch);
    if (missing.length > 0) { toast.error(`Informe a filial de destino para "${missing[0].tool_name}"`); return; }

    setSaving(true);
    try {
      const res = await fetch(`/api/ferramental/desligamentos/${desligamento.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validacoes }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      const result = await res.json();
      toast.success(result.status === 'com_divergencia' ? 'Validado com divergências registradas' : 'Devolução validada e estoque atualizado');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const inputSt = { padding: '0.45rem 0.65rem', border: '1px solid #ddd', borderRadius: '5px', fontSize: '0.8rem', outline: 'none', width: '100%', fontFamily: 'inherit' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '780px', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#000' }}>Validar Devolução — {desligamento.technician_name}</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>Confirme as quantidades e informe o destino no estoque central</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' }}>✕</button>
        </div>

        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #eee' }}>
                {['Ferramenta', 'Em Posse', 'Devolvido', 'Validado', 'Filial de Destino', 'Obs. Divergência'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {validacoes.map((v, i) => {
                const isDivergent = v.validated_quantity < v.returned_quantity;
                const missingFromExpected = v.expected_quantity - v.returned_quantity;
                return (
                  <tr key={v.devolucao_id} style={{ borderBottom: '1px solid #f0f0f0', background: isDivergent ? '#fff7ed' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ fontWeight: '700', color: '#111' }}>{v.tool_name}</div>
                      {v.tool_notes && <div style={{ fontSize: '0.65rem', color: '#f59e0b' }}>⚠ {v.tool_notes}</div>}
                      {missingFromExpected > 0 && (
                        <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: '700', marginTop: '0.1rem' }}>
                          ⚑ {missingFromExpected} não devolvido(s) pelo técnico
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#888' }}>{v.expected_quantity}</td>
                    <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: missingFromExpected > 0 ? '#ef4444' : '#374151' }}>{v.returned_quantity}</td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'center' }}>
                        <button onClick={() => update(i, 'validated_quantity', Math.max(0, v.validated_quantity - 1))}
                          style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: '800', color: isDivergent ? '#ef4444' : '#10b981', fontSize: '0.88rem' }}>{v.validated_quantity}</span>
                        <button onClick={() => update(i, 'validated_quantity', Math.min(v.returned_quantity, v.validated_quantity + 1))}
                          style={{ width: '22px', height: '22px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      {isDivergent && <div style={{ fontSize: '0.62rem', color: '#ef4444', fontWeight: '700', textAlign: 'center', marginTop: '0.15rem' }}>divergência</div>}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {v.validated_quantity > 0 ? (
                        <select value={v.destination_branch} onChange={e => update(i, 'destination_branch', e.target.value)}
                          style={{ ...inputSt, borderColor: !v.destination_branch ? '#fca5a5' : '#ddd', minWidth: '130px' }}>
                          <option value="">Selecione filial</option>
                          {branches.map(b => <option key={b} value={b}>{b}</option>)}
                          <option value="__nova__">+ Nova filial</option>
                        </select>
                      ) : <span style={{ fontSize: '0.75rem', color: '#ccc' }}>—</span>}
                      {v.destination_branch === '__nova__' && (
                        <input
                          placeholder="Nome da filial..."
                          onChange={e => update(i, 'destination_branch', e.target.value)}
                          style={{ ...inputSt, marginTop: '0.3rem' }}
                          autoFocus
                        />
                      )}
                    </td>
                    <td style={{ padding: '0.65rem 0.75rem' }}>
                      {(isDivergent || missingFromExpected > 0) ? (
                        <input value={v.divergence_notes} onChange={e => update(i, 'divergence_notes', e.target.value)}
                          placeholder="Motivo..." style={{ ...inputSt, minWidth: '120px' }} />
                      ) : <span style={{ fontSize: '0.75rem', color: '#ccc' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #eee', background: '#f9fafb', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.7rem 1.25rem', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', color: '#666', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving}
            style={{ padding: '0.7rem 1.5rem', background: saving ? '#e5e7eb' : '#000', color: saving ? '#9ca3af' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
            {saving ? 'VALIDANDO...' : 'CONFIRMAR VALIDAÇÃO'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Detalhe (somente leitura) ──────────────────────────
function ModalDetalhe({ desligamento, onClose }) {
  const itens = desligamento.ferramental_devolucoes || [];
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e5e7eb' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9fafb' }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: '900', color: '#000' }}>Devolução #{desligamento.id} — {desligamento.technician_name}</div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', alignItems: 'center' }}>
              <StatusPill status={desligamento.status} />
              <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{formatDate(desligamento.created_at)}</span>
              {desligamento.validated_by && <span style={{ fontSize: '0.72rem', color: '#aaa' }}>Validado por {desligamento.validated_by}</span>}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666' }}>✕</button>
        </div>
        <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #eee' }}>
                {['Ferramenta', 'Em Posse', 'Devolvido', 'Validado', 'Destino', 'Status'].map(h => (
                  <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '800', color: '#888', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => (
                <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: item.status === 'divergencia' ? '#fff7ed' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '0.65rem 0.75rem', fontWeight: '700', color: '#111' }}>{item.tool_name}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: '#888' }}>{item.expected_quantity}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: item.returned_quantity < item.expected_quantity ? '#ef4444' : '#374151' }}>{item.returned_quantity}</td>
                  <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: '700', color: item.validated_quantity != null ? '#10b981' : '#ccc' }}>
                    {item.validated_quantity ?? '—'}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', fontSize: '0.78rem', color: '#555' }}>{item.destination_branch || '—'}</td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    {item.status === 'divergencia' ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#ef4444', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>DIVERGÊNCIA</span>
                    ) : item.status === 'validado' ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#10b981', background: '#d1fae5', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>VALIDADO</span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#888', background: '#f3f4f6', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>PENDENTE</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {desligamento.notes && (
            <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: '#f9fafb', borderRadius: '8px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
              Obs.: {desligamento.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────
export default function DesligamentosPage() {
  const { data: session } = useSession();
  const [desligamentos, setDesligamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const role = session?.user?.role;
  const isGestor   = ['admin', 'supervisor'].includes(role);
  const isAnalista = role === 'analista_custo' || role === 'admin';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ferramental/desligamentos');
      const data = await res.json();
      setDesligamentos(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar desligamentos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const pendentes    = desligamentos.filter(d => d.status === 'aguardando_validacao').length;
  const divergencias = desligamentos.filter(d => d.status === 'com_divergencia').length;
  const concluidos   = desligamentos.filter(d => d.status === 'concluido').length;

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8' }}>
      <PageHeader
        title="Desligamentos"
        subtitle="Devolução e validação de ferramentas de técnicos desligados"
        actions={isGestor && (
          <button onClick={() => setModal({ type: 'novo' })}
            style={{ padding: '0.6rem 1.1rem', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase' }}>
            + Registrar Desligamento
          </button>
        )}
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: desligamentos.length, color: '#000' },
          { label: 'Aguard. Validação', value: pendentes, color: '#f59e0b' },
          { label: 'Com Divergência', value: divergencias, color: '#ef4444' },
          { label: 'Concluídos', value: concluidos, color: '#10b981' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', padding: '1.1rem', borderTop: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#888', fontWeight: '700', marginTop: '0.2rem', textTransform: 'uppercase' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabela */}
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Carregando...</div>
        ) : desligamentos.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Nenhum desligamento registrado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #eee' }}>
                  {['#', 'Técnico', 'Ferramentas', 'Status', 'Criado por', 'Data', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: '800', color: '#444', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {desligamentos.map((d, i) => {
                  const itens = d.ferramental_devolucoes || [];
                  const divergencias_count = itens.filter(it => it.status === 'divergencia' || it.returned_quantity < it.expected_quantity).length;
                  const canValidate = isAnalista && d.status === 'aguardando_validacao';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', color: '#aaa', fontWeight: '700' }}>#{d.id}</td>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#000' }}>{d.technician_name}</td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: '700', color: '#444' }}>{itens.length} ferramenta(s)</span>
                        {divergencias_count > 0 && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', color: '#ef4444', fontWeight: '800' }}>
                            {divergencias_count} divergência(s)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}><StatusPill status={d.status} /></td>
                      <td style={{ padding: '0.75rem 1rem', color: '#666', fontSize: '0.78rem' }}>{d.created_by}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#888', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(d.created_at)}</td>
                      <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => setModal({ type: 'detalhe', data: d })}
                          style={{ padding: '0.3rem 0.65rem', border: '1px solid #ddd', borderRadius: '5px', background: '#fff', color: '#444', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>
                          Ver
                        </button>
                        {canValidate && (
                          <button onClick={() => setModal({ type: 'validar', data: d })}
                            style={{ padding: '0.3rem 0.65rem', border: 'none', borderRadius: '5px', background: '#000', color: '#fff', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>
                            Validar
                          </button>
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

      {/* Modais */}
      {modal?.type === 'novo'    && <ModalNovoDesligamento onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'validar' && <ModalValidacao desligamento={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'detalhe' && <ModalDetalhe   desligamento={modal.data} onClose={() => setModal(null)} />}
    </div>
  );
}
