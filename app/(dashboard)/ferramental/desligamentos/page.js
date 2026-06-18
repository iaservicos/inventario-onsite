'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import PageHeader from '@/components/ui/PageHeader';

const STATUS_CFG = {
  aguardando_validacao: { label: 'Aguard. Validação', color: '#555', bg: '#eeeeee' },
  em_validacao:         { label: 'Em Validação',      color: '#222', bg: '#dddddd' },
  concluido:            { label: 'Concluído',          color: '#fff', bg: '#222222' },
  com_divergencia:      { label: 'Com Divergência',    color: '#fff', bg: '#000000' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || { label: status, color: '#555', bg: '#eee' };
  return (
    <span style={{ padding: '0.2rem 0.65rem', borderRadius: '20px', fontSize: '0.68rem', fontWeight: '800', color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
      {cfg.label}
    </span>
  );
}

const inputSt = { padding: '0.55rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem', outline: 'none', fontFamily: 'inherit', width: '100%', background: '#fff' };
const labelSt = { fontSize: '0.68rem', fontWeight: '800', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem', letterSpacing: '0.05em' };
const thSt    = { padding: '0.65rem 0.9rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '800', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' };

function Overlay({ children, onClose, maxWidth = '760px' }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '10px', width: '100%', maxWidth, maxHeight: '94vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid #e0e0e0', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ title, subtitle, onClose }) {
  return (
    <div style={{ padding: '1.2rem 1.75rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', background: '#fafafa', flexShrink: 0 }}>
      <div>
        <div style={{ fontSize: '1rem', fontWeight: '900', color: '#000', letterSpacing: '-0.01em' }}>{title}</div>
        {subtitle && <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.2rem' }}>{subtitle}</div>}
      </div>
      <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#888', marginLeft: '1rem', lineHeight: 1 }}>✕</button>
    </div>
  );
}

function ModalNovaDevolucao({ onClose, onSaved }) {
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [toolInventory, setToolInventory] = useState([]);
  const [returnedQtys, setReturnedQtys] = useState({});
  const [notes, setNotes] = useState('');
  const [loadingTech, setLoadingTech] = useState(true);
  const [loadingInv, setLoadingInv] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/technicians?active=true')
      .then(r => r.json())
      .then(d => setTechnicians(Array.isArray(d) ? d : []))
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
    if (!itens.length) { toast.error('Este técnico não possui ferramentas registradas'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/ferramental/desligamentos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: tech.id, technician_name: tech.name, itens, notes: notes.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao registrar'); return; }
      toast.success('Devolução registrada — aguardando validação da analista');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const canSave = !saving && selectedTech && toolInventory.length > 0;

  return (
    <Overlay onClose={onClose} maxWidth="820px">
      <ModalHeader title="Registrar Devolução de Ferramentas" subtitle="Informe as ferramentas recebidas do técnico. A analista irá validar as quantidades." onClose={onClose} />

      <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={labelSt}>Técnico *</label>
          {loadingTech
            ? <div style={{ ...inputSt, color: '#aaa' }}>Carregando técnicos...</div>
            : (
              <select value={selectedTech} onChange={e => setSelectedTech(e.target.value)} style={{ ...inputSt, cursor: 'pointer' }}>
                <option value="">— Selecione o técnico —</option>
                {technicians.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.supervisor_name ? ` — ${t.supervisor_name}` : ''}{t.region ? ` (${t.region})` : ''}</option>
                ))}
              </select>
            )}
        </div>

        {selectedTech && (
          loadingInv ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#aaa', fontSize: '0.82rem' }}>Carregando ferramentas do técnico...</div>
          ) : toolInventory.length === 0 ? (
            <div style={{ background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '8px', padding: '1rem 1.25rem', fontSize: '0.82rem', color: '#666', fontWeight: '600' }}>
              Nenhuma ferramenta registrada para este técnico.
            </div>
          ) : (
            <div>
              <label style={labelSt}>Ferramentas — informe a quantidade recebida de volta</label>
              <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#f5f5f5', borderBottom: '1px solid #e0e0e0' }}>
                      <th style={{ ...thSt, width: '50%' }}>Ferramenta</th>
                      <th style={{ ...thSt, textAlign: 'center' }}>Estava com técnico</th>
                      <th style={{ ...thSt, textAlign: 'center' }}>Qtd. recebida</th>
                    </tr>
                  </thead>
                  <tbody>
                    {toolInventory.map((item, i) => {
                      const ret = returnedQtys[item.tool_id] ?? item.quantity;
                      const falta = item.quantity - ret;
                      return (
                        <tr key={item.tool_id} style={{ borderTop: i > 0 ? '1px solid #f0f0f0' : 'none' }}>
                          <td style={{ padding: '0.8rem 0.9rem' }}>
                            <div style={{ fontWeight: '700', color: '#000' }}>{item.tool_name}</div>
                            {item.tool_notes && <div style={{ fontSize: '0.68rem', color: '#888', marginTop: '0.15rem', fontStyle: 'italic' }}>⚠ {item.tool_notes}</div>}
                          </td>
                          <td style={{ padding: '0.8rem 0.9rem', textAlign: 'center', fontWeight: '700', color: '#555' }}>{item.quantity}</td>
                          <td style={{ padding: '0.8rem 0.9rem', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                              <button onClick={() => setReturnedQtys(p => ({ ...p, [item.tool_id]: Math.max(0, (p[item.tool_id] ?? item.quantity) - 1) }))}
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                              <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: '900', fontSize: '0.9rem', color: falta > 0 ? '#000' : '#444' }}>{ret}</span>
                              <button onClick={() => setReturnedQtys(p => ({ ...p, [item.tool_id]: Math.min(item.quantity, (p[item.tool_id] ?? item.quantity) + 1) }))}
                                style={{ width: '26px', height: '26px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                            </div>
                            {falta > 0 && (
                              <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: '700', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                {falta} não recebido(s)
                              </div>
                            )}
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

        <div>
          <label style={labelSt}>Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opcional..."
            style={{ ...inputSt, resize: 'vertical' }} />
        </div>
      </div>

      <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #eee', background: '#fafafa', flexShrink: 0 }}>
        <button onClick={save} disabled={!canSave}
          style={{ width: '100%', padding: '0.9rem', background: canSave ? '#000' : '#e0e0e0', color: canSave ? '#fff' : '#aaa', border: 'none', borderRadius: '7px', fontSize: '0.85rem', fontWeight: '900', cursor: canSave ? 'pointer' : 'not-allowed', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {saving ? 'REGISTRANDO...' : 'REGISTRAR DEVOLUÇÃO'}
        </button>
      </div>
    </Overlay>
  );
}

function ModalValidacao({ devolucao, onClose, onSaved }) {
  const [branches, setBranches] = useState([]);
  const [novaBranchIdx, setNovaBranchIdx] = useState(null);
  const [validacoes, setValidacoes] = useState(
    (devolucao.ferramental_devolucoes || []).map(d => ({
      devolucao_id:       d.id,
      tool_name:          d.tool_name,
      tool_notes:         d.tool_notes,
      expected_quantity:  d.expected_quantity,
      returned_quantity:  d.returned_quantity,
      validated_quantity: d.validated_quantity ?? d.returned_quantity,
      destination_branch: d.destination_branch || '',
      divergence_notes:   d.divergence_notes || '',
    }))
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/ferramental/central-stock')
      .then(r => r.json())
      .then(data => {
        const set = new Set();
        (data || []).forEach(t => (t.branches || []).forEach(b => set.add(b.branch_name)));
        setBranches([...set].sort());
      });
  }, []);

  function update(idx, field, value) {
    setValidacoes(prev => prev.map((v, i) => i === idx ? { ...v, [field]: value } : v));
  }

  async function save() {
    const missing = validacoes.filter(v => v.validated_quantity > 0 && !v.destination_branch);
    if (missing.length) { toast.error(`Informe a filial para: "${missing[0].tool_name}"`); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/ferramental/desligamentos/${devolucao.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ validacoes }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      const result = await res.json();
      toast.success(result.status === 'com_divergencia' ? 'Validado com divergências registradas' : 'Devolução validada — estoque atualizado');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  return (
    <Overlay onClose={onClose} maxWidth="1080px">
      <ModalHeader
        title={`Validar Devolução — ${devolucao.technician_name}`}
        subtitle="Confirme as quantidades recebidas pelo supervisor e informe o destino no estoque central"
        onClose={onClose}
      />

      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '800px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              <th style={{ ...thSt, width: '28%' }}>Ferramenta</th>
              <th style={{ ...thSt, textAlign: 'center', width: '10%' }}>Estava c/ técnico</th>
              <th style={{ ...thSt, textAlign: 'center', width: '10%' }}>Supervisor recebeu</th>
              <th style={{ ...thSt, textAlign: 'center', width: '12%' }}>Qtd. validada</th>
              <th style={{ ...thSt, width: '22%' }}>Destino (filial)</th>
              <th style={{ ...thSt, width: '18%' }}>Obs. divergência</th>
            </tr>
          </thead>
          <tbody>
            {validacoes.map((v, i) => {
              const isDivergent       = v.validated_quantity < v.returned_quantity;
              const naoDevolvido      = v.expected_quantity - v.returned_quantity;
              const showDivergenceObs = isDivergent || naoDevolvido > 0;
              return (
                <tr key={v.devolucao_id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '0.85rem 0.9rem' }}>
                    <div style={{ fontWeight: '700', color: '#000' }}>{v.tool_name}</div>
                    {v.tool_notes && <div style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic', marginTop: '0.1rem' }}>⚠ {v.tool_notes}</div>}
                    {naoDevolvido > 0 && <div style={{ fontSize: '0.65rem', fontWeight: '700', color: '#555', marginTop: '0.15rem' }}>⚑ {naoDevolvido} não entregue(s) pelo técnico</div>}
                  </td>

                  <td style={{ padding: '0.85rem 0.9rem', textAlign: 'center', fontWeight: '700', color: '#666' }}>{v.expected_quantity}</td>

                  <td style={{ padding: '0.85rem 0.9rem', textAlign: 'center', fontWeight: '800', color: naoDevolvido > 0 ? '#000' : '#444' }}>
                    {v.returned_quantity}
                    {naoDevolvido > 0 && <div style={{ fontSize: '0.62rem', fontWeight: '600', color: '#888' }}>faltam {naoDevolvido}</div>}
                  </td>

                  <td style={{ padding: '0.85rem 0.9rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}>
                      <button onClick={() => update(i, 'validated_quantity', Math.max(0, v.validated_quantity - 1))}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                      <span style={{ minWidth: '28px', textAlign: 'center', fontWeight: '900', fontSize: '0.88rem', color: isDivergent ? '#000' : '#444', textDecoration: isDivergent ? 'underline' : 'none', textDecorationStyle: 'dotted' }}>{v.validated_quantity}</span>
                      <button onClick={() => update(i, 'validated_quantity', Math.min(v.returned_quantity, v.validated_quantity + 1))}
                        style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff', fontWeight: '900', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                    </div>
                    {isDivergent && <div style={{ fontSize: '0.62rem', fontWeight: '700', color: '#555', textAlign: 'center', marginTop: '0.2rem', fontStyle: 'italic' }}>divergência</div>}
                  </td>

                  <td style={{ padding: '0.85rem 0.9rem' }}>
                    {v.validated_quantity > 0 ? (
                      <>
                        {novaBranchIdx !== i ? (
                          <select value={v.destination_branch} onChange={e => {
                            if (e.target.value === '__nova__') { setNovaBranchIdx(i); update(i, 'destination_branch', ''); }
                            else update(i, 'destination_branch', e.target.value);
                          }} style={{ ...inputSt, borderColor: !v.destination_branch ? '#999' : '#ddd', fontSize: '0.78rem' }}>
                            <option value="">Selecione a filial</option>
                            {branches.map(b => <option key={b} value={b}>{b}</option>)}
                            <option value="__nova__">+ Digitar nova filial</option>
                          </select>
                        ) : (
                          <input autoFocus placeholder="Nome da filial..." value={v.destination_branch}
                            onChange={e => update(i, 'destination_branch', e.target.value)}
                            onBlur={() => { if (v.destination_branch) setNovaBranchIdx(null); }}
                            style={{ ...inputSt, fontSize: '0.78rem' }} />
                        )}
                      </>
                    ) : <span style={{ fontSize: '0.75rem', color: '#ccc' }}>—</span>}
                  </td>

                  <td style={{ padding: '0.85rem 0.9rem' }}>
                    {showDivergenceObs ? (
                      <input value={v.divergence_notes} onChange={e => update(i, 'divergence_notes', e.target.value)}
                        placeholder="Motivo..." style={{ ...inputSt, fontSize: '0.78rem' }} />
                    ) : <span style={{ fontSize: '0.75rem', color: '#ccc' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #eee', background: '#fafafa', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexShrink: 0 }}>
        <button onClick={onClose} style={{ padding: '0.7rem 1.5rem', border: '1px solid #ddd', borderRadius: '7px', background: '#fff', color: '#555', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer' }}>Cancelar</button>
        <button onClick={save} disabled={saving}
          style={{ padding: '0.7rem 1.75rem', background: saving ? '#e0e0e0' : '#000', color: saving ? '#aaa' : '#fff', border: 'none', borderRadius: '7px', fontSize: '0.82rem', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {saving ? 'VALIDANDO...' : 'CONFIRMAR VALIDAÇÃO'}
        </button>
      </div>
    </Overlay>
  );
}

function ModalDetalhe({ devolucao, onClose }) {
  const itens = devolucao.ferramental_devolucoes || [];
  const itemStatusLabel = { pendente: 'Pendente', validado: 'Validado', divergencia: 'Divergência' };

  return (
    <Overlay onClose={onClose} maxWidth="900px">
      <ModalHeader
        title={`Devolução #${devolucao.id} — ${devolucao.technician_name}`}
        subtitle={
          <span style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.35rem', flexWrap: 'wrap' }}>
            <StatusPill status={devolucao.status} />
            <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{formatDate(devolucao.created_at)}</span>
            {devolucao.created_by && <span style={{ fontSize: '0.72rem', color: '#aaa' }}>por {devolucao.created_by}</span>}
            {devolucao.validated_by && <span style={{ fontSize: '0.72rem', color: '#aaa' }}>— validado por {devolucao.validated_by}</span>}
          </span>
        }
        onClose={onClose}
      />
      <div style={{ overflowX: 'auto', overflowY: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', minWidth: '600px' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
              {['Ferramenta', 'Estava c/ técnico', 'Supervisor recebeu', 'Validado', 'Destino', 'Situação'].map(h => (
                <th key={h} style={thSt}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {itens.map((item, i) => (
              <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '0.75rem 0.9rem', fontWeight: '700', color: '#000' }}>
                  {item.tool_name}
                  {item.tool_notes && <div style={{ fontSize: '0.65rem', color: '#888', fontStyle: 'italic' }}>⚠ {item.tool_notes}</div>}
                </td>
                <td style={{ padding: '0.75rem 0.9rem', textAlign: 'center', color: '#666' }}>{item.expected_quantity}</td>
                <td style={{ padding: '0.75rem 0.9rem', textAlign: 'center', fontWeight: '700', color: item.returned_quantity < item.expected_quantity ? '#000' : '#444' }}>
                  {item.returned_quantity}
                  {item.returned_quantity < item.expected_quantity && (
                    <div style={{ fontSize: '0.62rem', color: '#888', fontStyle: 'italic' }}>faltam {item.expected_quantity - item.returned_quantity}</div>
                  )}
                </td>
                <td style={{ padding: '0.75rem 0.9rem', textAlign: 'center', fontWeight: '700', color: item.validated_quantity != null ? '#000' : '#ccc' }}>
                  {item.validated_quantity ?? '—'}
                </td>
                <td style={{ padding: '0.75rem 0.9rem', fontSize: '0.78rem', color: '#555' }}>{item.destination_branch || '—'}</td>
                <td style={{ padding: '0.75rem 0.9rem' }}>
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', padding: '0.15rem 0.55rem', borderRadius: '20px',
                    background: item.status === 'divergencia' ? '#000' : item.status === 'validado' ? '#222' : '#eee',
                    color: item.status === 'pendente' ? '#666' : '#fff',
                  }}>
                    {itemStatusLabel[item.status] || item.status}
                  </span>
                  {item.divergence_notes && (
                    <div style={{ fontSize: '0.65rem', color: '#888', marginTop: '0.2rem', fontStyle: 'italic' }}>{item.divergence_notes}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {devolucao.notes && (
          <div style={{ margin: '0.75rem 1rem', padding: '0.75rem 1rem', background: '#f5f5f5', borderRadius: '6px', fontSize: '0.8rem', color: '#555', fontStyle: 'italic' }}>
            Obs.: {devolucao.notes}
          </div>
        )}
      </div>
    </Overlay>
  );
}

export default function DevolucoesPage() {
  const { data: session } = useSession();
  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(null);

  const role       = session?.user?.role;
  const isGestor   = ['admin', 'supervisor'].includes(role);
  const isAnalista = ['admin', 'analista_custo'].includes(role);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/ferramental/desligamentos');
      const data = await res.json();
      setDevolucoes(Array.isArray(data) ? data : []);
    } catch { toast.error('Erro ao carregar devoluções'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalPendentes   = devolucoes.filter(d => d.status === 'aguardando_validacao').length;
  const totalDivergencia = devolucoes.filter(d => d.status === 'com_divergencia').length;
  const totalConcluidos  = devolucoes.filter(d => d.status === 'concluido').length;

  const kpis = [
    { label: 'Total',              value: devolucoes.length },
    { label: 'Aguard. Validação',  value: totalPendentes },
    { label: 'Com Divergência',    value: totalDivergencia },
    { label: 'Concluídos',         value: totalConcluidos },
  ];

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageHeader
        title="Devoluções"
        subtitle="Registro e validação de ferramentas devolvidas pelos técnicos"
        actions={isGestor && (
          <button onClick={() => setModal({ type: 'novo' })}
            style={{ padding: '0.6rem 1.1rem', background: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            + Nova Devolução
          </button>
        )}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '1.1rem 1.25rem' }}>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#000', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', color: '#888', fontWeight: '700', marginTop: '0.35rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Carregando...</div>
        ) : devolucoes.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Nenhuma devolução registrada.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #e0e0e0' }}>
                  {['#', 'Técnico', 'Ferramentas', 'Status', 'Registrado por', 'Data', 'Ações'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {devolucoes.map((d, i) => {
                  const itens = d.ferramental_devolucoes || [];
                  const divCount = itens.filter(it => it.returned_quantity < it.expected_quantity).length;
                  const canValidate = isAnalista && d.status === 'aguardando_validacao';
                  return (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ padding: '0.8rem 0.9rem', color: '#bbb', fontWeight: '700', fontSize: '0.75rem' }}>#{d.id}</td>
                      <td style={{ padding: '0.8rem 0.9rem', fontWeight: '800', color: '#000' }}>{d.technician_name}</td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        <span style={{ fontWeight: '700', color: '#444' }}>{itens.length} item(s)</span>
                        {divCount > 0 && (
                          <span style={{ marginLeft: '0.5rem', fontSize: '0.68rem', fontWeight: '800', color: '#555', fontStyle: 'italic' }}>
                            ({divCount} com falta)
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '0.8rem 0.9rem' }}><StatusPill status={d.status} /></td>
                      <td style={{ padding: '0.8rem 0.9rem', color: '#666', fontSize: '0.78rem' }}>{d.created_by}</td>
                      <td style={{ padding: '0.8rem 0.9rem', color: '#888', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(d.created_at)}</td>
                      <td style={{ padding: '0.8rem 0.9rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => setModal({ type: 'detalhe', data: d })}
                            style={{ padding: '0.3rem 0.7rem', border: '1px solid #ddd', borderRadius: '5px', background: '#fff', color: '#444', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}>
                            Ver
                          </button>
                          {canValidate && (
                            <button onClick={() => setModal({ type: 'validar', data: d })}
                              style={{ padding: '0.3rem 0.7rem', border: 'none', borderRadius: '5px', background: '#000', color: '#fff', fontSize: '0.72rem', fontWeight: '800', cursor: 'pointer' }}>
                              Validar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modal?.type === 'novo'    && <ModalNovaDevolucao onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'validar' && <ModalValidacao devolucao={modal.data} onClose={() => setModal(null)} onSaved={load} />}
      {modal?.type === 'detalhe' && <ModalDetalhe   devolucao={modal.data} onClose={() => setModal(null)} />}
    </div>
  );
}
