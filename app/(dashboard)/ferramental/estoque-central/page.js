'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';

function ModalNovaFilial({ toolId, toolName, existing, onClose, onSaved }) {
  const [branch, setBranch] = useState('');
  const [quantity, setQuantity] = useState(0);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const existingBranches = existing.map(e => e.branch_name.toLowerCase());

  async function save() {
    if (!branch.trim()) { toast.error('Informe o nome da filial'); return; }
    if (existingBranches.includes(branch.trim().toLowerCase())) {
      toast.error('Já existe um registro para esta filial nesta ferramenta'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/ferramental/central-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: toolId, branch_name: branch.trim(), quantity, storage_location: location.trim() || null, notes: notes.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao salvar'); return; }
      toast.success('Filial adicionada');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const fieldStyle = { width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.72rem', fontWeight: '800', color: '#555555', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', border: '1px solid #dddddd', borderRadius: '10px', width: '100%', maxWidth: '440px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eeeeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' }}>
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: '900', color: '#000000' }}>Nova Filial</div>
            <div style={{ fontSize: '0.72rem', color: '#888888', marginTop: '0.1rem' }}>{toolName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666666' }}>✕</button>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={labelStyle}>Nome da Filial *</label>
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Ex: Curitiba, São Paulo..." style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Quantidade em Estoque</label>
            <input type="number" min={0} value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 0)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Local de Armazenamento</label>
            <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Ex: Armário 3, Prateleira B" style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opcional..." style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '0.8rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
            {saving ? 'SALVANDO...' : 'ADICIONAR'}
          </button>
        </div>
      </div>
    </div>
  );
}

function BranchRow({ entry, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(entry.quantity);
  const [loc, setLoc] = useState(entry.storage_location || '');
  const [notes, setNotes] = useState(entry.notes || '');
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/ferramental/central-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool_id: entry.tool_id, branch_name: entry.branch_name, quantity: qty, storage_location: loc.trim() || null, notes: notes.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro'); return; }
      toast.success('Salvo');
      setEditing(false);
      onEdit();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  async function remove() {
    if (!confirm(`Remover ${entry.branch_name} desta ferramenta?`)) return;
    try {
      const res = await fetch(`/api/ferramental/central-stock?id=${entry.id}`, { method: 'DELETE' });
      if (!res.ok) { toast.error('Erro ao remover'); return; }
      toast.success('Removido');
      onDelete();
    } catch { toast.error('Erro de conexão'); }
  }

  const cellStyle = { padding: '0.7rem 1rem', verticalAlign: 'middle' };

  if (editing) {
    return (
      <tr style={{ background: '#fffbeb' }}>
        <td style={{ ...cellStyle, fontWeight: '700', fontSize: '0.82rem' }}>{entry.branch_name}</td>
        <td style={cellStyle}>
          <input type="number" min={0} value={qty} onChange={e => setQty(parseInt(e.target.value) || 0)}
            style={{ width: '70px', padding: '0.35rem 0.5rem', border: '1px solid #000000', borderRadius: '4px', fontSize: '0.82rem', fontWeight: '700', textAlign: 'center' }} />
        </td>
        <td style={cellStyle}>
          <input value={loc} onChange={e => setLoc(e.target.value)} placeholder="Local de armazenamento"
            style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #dddddd', borderRadius: '4px', fontSize: '0.82rem' }} />
        </td>
        <td style={cellStyle}>
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações"
            style={{ width: '100%', padding: '0.35rem 0.5rem', border: '1px solid #dddddd', borderRadius: '4px', fontSize: '0.82rem' }} />
        </td>
        <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
          <button onClick={save} disabled={saving} style={{ padding: '0.3rem 0.7rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer', marginRight: '0.35rem' }}>
            {saving ? '...' : 'Salvar'}
          </button>
          <button onClick={() => setEditing(false)} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#666666', border: '1px solid #dddddd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>
            Cancelar
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
      <td style={{ ...cellStyle, fontWeight: '700', fontSize: '0.82rem', color: '#222222' }}>{entry.branch_name}</td>
      <td style={{ ...cellStyle, textAlign: 'center' }}>
        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: qty === 0 ? '#ef4444' : '#22c55e' }}>{qty}</span>
      </td>
      <td style={{ ...cellStyle, fontSize: '0.8rem', color: loc ? '#333333' : '#bbbbbb', fontStyle: loc ? 'normal' : 'italic' }}>
        {loc || 'Não informado'}
      </td>
      <td style={{ ...cellStyle, fontSize: '0.8rem', color: notes ? '#555555' : '#bbbbbb', fontStyle: notes ? 'normal' : 'italic' }}>
        {notes || '—'}
      </td>
      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
        <button onClick={() => setEditing(true)} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#000000', border: '1px solid #dddddd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', marginRight: '0.35rem' }}>Editar</button>
        <button onClick={remove} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Remover</button>
      </td>
    </tr>
  );
}

export default function EstoqueCentralPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ferramental/central-stock');
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch { toast.error('Erro ao carregar estoque'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data.filter(t => t.tool_name.toLowerCase().includes(search.toLowerCase()));

  const totalFiliais = data.reduce((s, t) => s + t.branches.length, 0);
  const totalItens = data.reduce((s, t) => s + t.branches.reduce((ss, b) => ss + b.quantity, 0), 0);
  const ferramentasComEstoque = data.filter(t => t.branches.some(b => b.quantity > 0)).length;

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8' }}>
      <PageHeader title="Estoque Central" subtitle="Controle de ferramentas disponíveis nas filiais" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Filiais cadastradas', value: totalFiliais },
          { label: 'Itens em estoque', value: totalItens, color: totalItens > 0 ? '#22c55e' : '#888888' },
          { label: 'Ferramentas c/ estoque', value: `${ferramentasComEstoque}/${data.length}` },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: kpi.color || '#000000' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#888888', fontWeight: '700', marginTop: '0.25rem', textTransform: 'uppercase' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Barra de busca */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar ferramenta..."
          style={{ flex: 1, padding: '0.5rem 0.75rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
        />
        <button onClick={load} style={{ padding: '0.5rem 1rem', border: '1px solid #dddddd', borderRadius: '6px', background: 'transparent', color: '#666666', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
      </div>

      {/* Lista de ferramentas */}
      {loading ? (
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.map(tool => {
            const isOpen = expanded === tool.tool_id;
            const totalQty = tool.branches.reduce((s, b) => s + b.quantity, 0);

            return (
              <div key={tool.tool_id} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' }}>
                {/* Cabeçalho da ferramenta */}
                <div
                  onClick={() => setExpanded(isOpen ? null : tool.tool_id)}
                  style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ fontSize: '0.75rem', color: isOpen ? '#000000' : '#888888', fontWeight: '900', transition: 'transform 0.15s', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#000000' }}>{tool.tool_name}</div>
                    {tool.tool_notes && <div style={{ fontSize: '0.7rem', color: '#f59e0b', marginTop: '0.15rem' }}>⚠ {tool.tool_notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '600' }}>{tool.branches.length} filial(is)</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800',
                      background: totalQty === 0 ? '#fef2f2' : '#f0fdf4',
                      color: totalQty === 0 ? '#ef4444' : '#22c55e',
                    }}>
                      {totalQty} em estoque
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setModal({ toolId: tool.tool_id, toolName: tool.tool_name, existing: tool.branches }); }}
                      style={{ padding: '0.3rem 0.75rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      + Filial
                    </button>
                  </div>
                </div>

                {/* Tabela de filiais */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #f0f0f0' }}>
                    {tool.branches.length === 0 ? (
                      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#aaaaaa', fontSize: '0.82rem', fontStyle: 'italic' }}>
                        Nenhuma filial cadastrada. Clique em "+ Filial" para adicionar.
                      </div>
                    ) : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                        <thead>
                          <tr style={{ background: '#fafafa' }}>
                            {['Filial', 'Quantidade', 'Armazenado em', 'Observações', 'Ações'].map(h => (
                              <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: '800', color: '#888888', textTransform: 'uppercase', borderBottom: '1px solid #eeeeee' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tool.branches.map(b => (
                            <BranchRow key={b.id} entry={{ ...b, tool_id: tool.tool_id }} onEdit={load} onDelete={load} />
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <ModalNovaFilial
          toolId={modal.toolId}
          toolName={modal.toolName}
          existing={modal.existing}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
