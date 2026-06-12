'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import PageHeader from '@/components/ui/PageHeader';

function QuantityControl({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={disabled || value <= 0}
        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #dddddd', background: value <= 0 ? '#f8f8f8' : '#ffffff', color: value <= 0 ? '#cccccc' : '#000000', fontSize: '1rem', fontWeight: '900', cursor: value <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >−</button>
      <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: '800', fontSize: '0.9rem', color: value > 0 ? '#000000' : '#bbbbbb' }}>{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #dddddd', background: '#ffffff', color: '#000000', fontSize: '1rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
      >+</button>
    </div>
  );
}

export default function FerramentalEstoquePage() {
  const [technicians, setTechnicians] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [inventory, setInventory] = useState([]);
  const [loadingTechs, setLoadingTechs] = useState(true);
  const [loadingInv, setLoadingInv] = useState(false);
  const [saving, setSaving] = useState({});
  const [dirty, setDirty] = useState({});
  const [localQty, setLocalQty] = useState({});

  useEffect(() => {
    fetch('/api/technicians')
      .then(r => r.json())
      .then(data => setTechnicians((data || []).filter(t => t.active !== false)))
      .catch(() => toast.error('Erro ao carregar técnicos'))
      .finally(() => setLoadingTechs(false));
  }, []);

  const loadInventory = useCallback(async (techId) => {
    if (!techId) { setInventory([]); return; }
    setLoadingInv(true);
    setDirty({});
    try {
      const res = await fetch(`/api/ferramental/technician-inventory?technician_id=${techId}`);
      const data = await res.json();
      const inv = Array.isArray(data) ? data : [];
      setInventory(inv);
      const qty = {};
      inv.forEach(item => { qty[item.tool_id] = item.quantity; });
      setLocalQty(qty);
    } catch { toast.error('Erro ao carregar inventário'); }
    finally { setLoadingInv(false); }
  }, []);

  useEffect(() => { loadInventory(selectedId); }, [selectedId, loadInventory]);

  function handleQtyChange(toolId, newQty) {
    setLocalQty(prev => ({ ...prev, [toolId]: newQty }));
    setDirty(prev => ({ ...prev, [toolId]: true }));
  }

  async function saveItem(toolId) {
    setSaving(prev => ({ ...prev, [toolId]: true }));
    try {
      const res = await fetch('/api/ferramental/technician-inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technician_id: parseInt(selectedId), tool_id: toolId, quantity: localQty[toolId] ?? 0 }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.error || 'Erro ao salvar'); return; }
      toast.success('Salvo');
      setDirty(prev => ({ ...prev, [toolId]: false }));
    } catch { toast.error('Erro de conexão'); }
    finally { setSaving(prev => ({ ...prev, [toolId]: false })); }
  }

  async function saveAll() {
    const dirtyIds = Object.keys(dirty).filter(id => dirty[id]);
    if (dirtyIds.length === 0) { toast('Nenhuma alteração pendente'); return; }
    for (const id of dirtyIds) await saveItem(parseInt(id));
    toast.success(`${dirtyIds.length} item(s) salvo(s)`);
  }

  const selectedTech = technicians.find(t => t.id === parseInt(selectedId));
  const totalFerramentas = inventory.filter(i => (localQty[i.tool_id] ?? 0) > 0).length;
  const hasDirty = Object.values(dirty).some(Boolean);

  return (
    <div style={{ padding: '2rem', width: '100%', minHeight: '100vh', background: '#f8f8f8', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <PageHeader title="Estoque por Técnico" subtitle="Controle de ferramentas em posse de cada técnico" />

      {/* Seletor de técnico */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#888888', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
            Selecionar Técnico
          </label>
          {loadingTechs ? (
            <div style={{ padding: '0.75rem', border: '1px solid #eeeeee', borderRadius: '6px', color: '#888888', fontSize: '0.85rem' }}>Carregando técnicos...</div>
          ) : (
            <select
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '600', color: '#000000', background: '#ffffff', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">— Selecione um técnico —</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.supervisor_name ? ` (${t.supervisor_name})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedTech && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {hasDirty && (
              <button onClick={saveAll} style={{ padding: '0.65rem 1.25rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase' }}>
                Salvar Tudo
              </button>
            )}
            <button onClick={() => loadInventory(selectedId)} style={{ padding: '0.65rem 1.25rem', background: 'transparent', color: '#666666', border: '1px solid #dddddd', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}>
              ↻ Recarregar
            </button>
          </div>
        )}
      </div>

      {/* Info do técnico selecionado */}
      {selectedTech && (
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1rem 1.25rem', marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Técnico</div>
            <div style={{ fontWeight: '900', fontSize: '1rem', color: '#000000', marginTop: '0.2rem' }}>{selectedTech.name}</div>
          </div>
          {selectedTech.supervisor_name && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Supervisor</div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#333333', marginTop: '0.2rem' }}>{selectedTech.supervisor_name}</div>
            </div>
          )}
          {selectedTech.region && (
            <div>
              <div style={{ fontSize: '0.7rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Região</div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: '#333333', marginTop: '0.2rem' }}>{selectedTech.region}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.7rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Ferramentas em posse</div>
            <div style={{ fontWeight: '900', fontSize: '1rem', color: totalFerramentas > 0 ? '#22c55e' : '#888888', marginTop: '0.2rem' }}>{totalFerramentas} / {inventory.length}</div>
          </div>
        </div>
      )}

      {/* Grid de ferramentas */}
      {!selectedId ? (
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>
          Selecione um técnico para visualizar e gerenciar suas ferramentas.
        </div>
      ) : loadingInv ? (
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '4rem', textAlign: 'center', color: '#888888', fontWeight: '700' }}>
          Carregando ferramentas...
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #eeeeee' }}>
                  <th style={{ padding: '0.75rem 1.25rem', textAlign: 'left', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem' }}>Ferramenta</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem' }}>Qtd. Padrão</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem' }}>Em Posse</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '800', color: '#333333', textTransform: 'uppercase', fontSize: '0.7rem' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item, idx) => {
                  const qty = localQty[item.tool_id] ?? 0;
                  const isDirtyItem = dirty[item.tool_id];
                  const isSaving = saving[item.tool_id];
                  const temFerramentas = qty > 0;
                  const temTudo = qty >= item.default_qty;

                  return (
                    <tr key={item.tool_id} style={{ borderBottom: '1px solid #f0f0f0', background: isDirtyItem ? '#fffbeb' : idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.85rem 1.25rem' }}>
                        <div style={{ fontWeight: '700', color: '#000000' }}>{item.tool_name}</div>
                        {item.tool_notes && (
                          <div style={{ fontSize: '0.7rem', color: '#f59e0b', fontWeight: '600', marginTop: '0.2rem' }}>⚠ {item.tool_notes}</div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center', fontWeight: '700', color: '#888888' }}>{item.default_qty}</td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <QuantityControl value={qty} onChange={(v) => handleQtyChange(item.tool_id, v)} disabled={isSaving} />
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                          color: !temFerramentas ? '#ef4444' : temTudo ? '#22c55e' : '#f59e0b',
                          background: !temFerramentas ? '#2a0a0a' : temTudo ? '#0a2a0a' : '#2a1a00',
                        }}>
                          {!temFerramentas ? 'Sem ferramenta' : temTudo ? 'Completo' : 'Parcial'}
                        </span>
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                        {isDirtyItem ? (
                          <button onClick={() => saveItem(item.tool_id)} disabled={isSaving} style={{ padding: '0.35rem 0.75rem', background: '#000000', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer' }}>
                            {isSaving ? '...' : 'Salvar'}
                          </button>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: '700' }}>
                            {item.updated_at ? '✓ Salvo' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
