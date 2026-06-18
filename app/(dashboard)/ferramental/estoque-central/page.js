'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';

async function exportToExcel(data, filterBranch) {
  const { utils, writeFile } = await import('xlsx');

  const rows = [];
  for (const tool of data) {
    const branches = filterBranch
      ? tool.branches.filter(b => b.branch_name === filterBranch)
      : tool.branches;
    for (const b of branches) {
      rows.push({
        'Ferramenta':            tool.tool_name,
        'Observação Ferramenta': tool.tool_notes || '',
        'Filial':                b.branch_name,
        'Quantidade':            b.quantity,
        'Armazenado em':         b.storage_location || '',
        'Observações':           b.notes || '',
        'Atualizado por':        b.updated_by || '',
      });
    }
    if (branches.length === 0) {
      rows.push({
        'Ferramenta': tool.tool_name,
        'Observação Ferramenta': tool.tool_notes || '',
        'Filial': filterBranch || '(sem filial)',
        'Quantidade': 0,
        'Armazenado em': '',
        'Observações': '',
        'Atualizado por': '',
      });
    }
  }

  const ws = utils.json_to_sheet(rows);
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Estoque Central');
  const now = new Date();
  const stamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  writeFile(wb, `estoque-central-${stamp}.xlsx`);
}

function ModalNovaFerramenta({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error('Informe o nome da ferramenta'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/ferramental/tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), default_quantity: qty, notes: notes.trim() || null }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao salvar'); return; }
      toast.success('Ferramenta adicionada ao catálogo');
      onSaved();
      onClose();
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(false); }
  }

  const fieldStyle = { width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' };
  const labelStyle = { fontSize: '0.72rem', fontWeight: '800', color: '#555555', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '1px solid #dddddd', borderRadius: '10px', width: '100%', maxWidth: '420px', overflow: 'hidden' }}>
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #eeeeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: '900', color: '#000000' }}>Nova Ferramenta no Catálogo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#666666' }}>✕</button>
        </div>
        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={labelStyle}>Nome da Ferramenta *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: MULTÍMETRO DIGITAL" style={fieldStyle} autoFocus />
          </div>
          <div>
            <label style={labelStyle}>Quantidade padrão por técnico</label>
            <input type="number" min={1} value={qty} onChange={e => setQty(parseInt(e.target.value) || 1)} style={fieldStyle} />
          </div>
          <div>
            <label style={labelStyle}>Observação (ex: aviso de devolução)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Opcional..." style={{ ...fieldStyle, resize: 'vertical' }} />
          </div>
          <button onClick={save} disabled={saving} style={{ width: '100%', padding: '0.8rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '900', cursor: saving ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
            {saving ? 'SALVANDO...' : 'ADICIONAR AO CATÁLOGO'}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: '#ffffff', border: '1px solid #dddddd', borderRadius: '10px', width: '100%', maxWidth: '440px', overflow: 'hidden' }}>
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
            <input value={branch} onChange={e => setBranch(e.target.value)} placeholder="Ex: Curitiba, São Paulo..." style={fieldStyle} autoFocus />
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
        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: qty === 0 ? '#999' : '#000' }}>{qty}</span>
      </td>
      <td style={{ ...cellStyle, fontSize: '0.8rem', color: loc ? '#333333' : '#bbbbbb', fontStyle: loc ? 'normal' : 'italic' }}>
        {loc || 'Não informado'}
      </td>
      <td style={{ ...cellStyle, fontSize: '0.8rem', color: notes ? '#555555' : '#bbbbbb', fontStyle: notes ? 'normal' : 'italic' }}>
        {notes || '—'}
      </td>
      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>
        <button onClick={() => setEditing(true)} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#000000', border: '1px solid #dddddd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', marginRight: '0.35rem' }}>Editar</button>
        <button onClick={remove} style={{ padding: '0.3rem 0.7rem', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}>Remover</button>
      </td>
    </tr>
  );
}

export default function EstoqueCentralPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTool, setSearchTool] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [modal, setModal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [exporting, setExporting] = useState(false);

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

  const allBranches = useMemo(() => {
    const set = new Set();
    data.forEach(t => t.branches.forEach(b => set.add(b.branch_name)));
    return [...set].sort();
  }, [data]);

  const filtered = useMemo(() => {
    return data
      .filter(t => t.tool_name.toLowerCase().includes(searchTool.toLowerCase()))
      .map(t => ({
        ...t,
        branches: filterBranch ? t.branches.filter(b => b.branch_name === filterBranch) : t.branches,
      }));
  }, [data, searchTool, filterBranch]);

  const totalFiliais   = allBranches.length;
  const totalItens     = data.reduce((s, t) => s + t.branches.reduce((ss, b) => ss + b.quantity, 0), 0);
  const comEstoque     = data.filter(t => t.branches.some(b => b.quantity > 0)).length;

  async function handleExport() {
    setExporting(true);
    try { await exportToExcel(filtered, filterBranch); }
    catch { toast.error('Erro ao gerar relatório'); }
    finally { setExporting(false); }
  }

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8' }}>
      <PageHeader
        title="Estoque Central"
        subtitle="Controle de ferramentas disponíveis nas filiais"
        actions={
          <button
            onClick={() => setModal({ type: 'nova_ferramenta' })}
            style={{ padding: '0.6rem 1.1rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase' }}
          >
            + Nova Ferramenta
          </button>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Filiais cadastradas', value: totalFiliais },
          { label: 'Itens em estoque', value: totalItens },
          { label: 'Ferramentas c/ estoque', value: `${comEstoque}/${data.length}` },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem' }}>
            <div style={{ fontSize: '1.8rem', fontWeight: '900', color: '#000' }}>{kpi.value}</div>
            <div style={{ fontSize: '0.72rem', color: '#888888', fontWeight: '700', marginTop: '0.25rem', textTransform: 'uppercase' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '0.85rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={searchTool}
          onChange={e => setSearchTool(e.target.value)}
          placeholder="Filtrar por ferramenta..."
          style={{ flex: 1, minWidth: '180px', padding: '0.5rem 0.75rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
        />
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', outline: 'none', minWidth: '160px', cursor: 'pointer' }}
        >
          <option value="">Todas as filiais</option>
          {allBranches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <button onClick={load} style={{ padding: '0.5rem 0.9rem', border: '1px solid #dddddd', borderRadius: '6px', background: 'transparent', color: '#666666', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
          ↻ Atualizar
        </button>
        <button onClick={handleExport} disabled={exporting || loading} style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '6px', background: '#000', color: '#fff', fontSize: '0.8rem', fontWeight: '800', cursor: exporting ? 'not-allowed' : 'pointer', opacity: exporting ? 0.7 : 1 }}>
          {exporting ? 'Gerando...' : '↓ Exportar Excel'}
        </button>
      </div>

      {loading ? (
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {filtered.length === 0 && (
            <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '3rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>
              Nenhuma ferramenta encontrada.
            </div>
          )}
          {filtered.map(tool => {
            const isOpen = expanded === tool.tool_id;
            const totalQty = tool.branches.reduce((s, b) => s + b.quantity, 0);

            return (
              <div key={tool.tool_id} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : tool.tool_id)}
                  style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', userSelect: 'none' }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '900', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '800', fontSize: '0.88rem', color: '#000000' }}>{tool.tool_name}</div>
                    {tool.tool_notes && <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.15rem' }}>⚠ {tool.tool_notes}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#888888', fontWeight: '600' }}>{tool.branches.length} filial(is)</span>
                    <span style={{ padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', background: totalQty === 0 ? '#000' : '#f0f0f0', color: totalQty === 0 ? '#fff' : '#000' }}>
                      {totalQty} em estoque
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); setModal({ type: 'nova_filial', toolId: tool.tool_id, toolName: tool.tool_name, existing: tool.branches }); }}
                      style={{ padding: '0.3rem 0.75rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '800', cursor: 'pointer' }}
                    >
                      + Filial
                    </button>
                  </div>
                </div>

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

      {modal?.type === 'nova_ferramenta' && (
        <ModalNovaFerramenta onClose={() => setModal(null)} onSaved={load} />
      )}
      {modal?.type === 'nova_filial' && (
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
