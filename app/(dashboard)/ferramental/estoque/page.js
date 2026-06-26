'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';

const selSt = { width: '100%', padding: '0.65rem 0.9rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.82rem', fontWeight: '600', color: 'var(--color-text-primary)', background: 'var(--color-bg-primary)', cursor: 'pointer', outline: 'none' };
const labelSt = { fontSize: '0.68rem', fontWeight: '800', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' };

function QuantityControl({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <button onClick={() => onChange(Math.max(0, value - 1))} disabled={disabled || value <= 0}
        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: value <= 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)', color: value <= 0 ? 'var(--color-border-light)' : 'var(--color-text-primary)', fontSize: '1rem', fontWeight: '900', cursor: value <= 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>−</button>
      <span style={{ minWidth: '32px', textAlign: 'center', fontWeight: '800', fontSize: '0.9rem', color: value > 0 ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>{value}</span>
      <button onClick={() => onChange(value + 1)} disabled={disabled}
        style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid var(--color-border-light)', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontSize: '1rem', fontWeight: '900', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>+</button>
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
  const [filterSup, setFilterSup] = useState('');
  const [filterRegion, setFilterRegion] = useState('');

  useEffect(() => {
    fetch('/api/technicians?active=true')
      .then(r => r.json())
      .then(data => setTechnicians(Array.isArray(data) ? data : []))
      .catch(() => toast.error('Erro ao carregar técnicos'))
      .finally(() => setLoadingTechs(false));
  }, []);

  const supervisors = useMemo(() => [...new Set(technicians.map(t => t.supervisor_name).filter(Boolean))].sort(), [technicians]);
  const regions     = useMemo(() => [...new Set(technicians.map(t => t.region).filter(Boolean))].sort(), [technicians]);

  const filteredTechs = useMemo(() => technicians.filter(t => {
    if (filterSup    && t.supervisor_name !== filterSup)    return false;
    if (filterRegion && t.region          !== filterRegion) return false;
    return true;
  }), [technicians, filterSup, filterRegion]);

  useEffect(() => {
    if (selectedId && !filteredTechs.find(t => t.id === parseInt(selectedId))) {
      setSelectedId('');
    }
  }, [filteredTechs, selectedId]);

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
    if (!dirtyIds.length) { toast('Nenhuma alteração pendente'); return; }
    for (const id of dirtyIds) await saveItem(parseInt(id));
    toast.success(`${dirtyIds.length} item(s) salvo(s)`);
  }

  const selectedTech = technicians.find(t => t.id === parseInt(selectedId));
  const totalFerramentas = inventory.filter(i => (localQty[i.tool_id] ?? 0) > 0).length;
  const hasDirty = Object.values(dirty).some(Boolean);

  return (
    <DashboardLayout title="Estoque por Técnico" subtitle="Controle de ferramentas em posse de cada técnico">

      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', alignItems: 'end' }}>

          <div>
            <label style={labelSt}>Supervisor</label>
            <select value={filterSup} onChange={e => { setFilterSup(e.target.value); setSelectedId(''); }} style={selSt}>
              <option value="">Todos os supervisores</option>
              {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label style={labelSt}>Estado (UF)</label>
            <select value={filterRegion} onChange={e => { setFilterRegion(e.target.value); setSelectedId(''); }} style={selSt}>
              <option value="">Todos os estados</option>
              {regions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ gridColumn: 'span 1' }}>
            <label style={labelSt}>
              Técnico
              {filteredTechs.length > 0 && (
                <span style={{ marginLeft: '0.4rem', fontWeight: '600', color: '#aaa', textTransform: 'none' }}>({filteredTechs.length} disponíveis)</span>
              )}
            </label>
            {loadingTechs ? (
              <div style={{ padding: '0.65rem 0.9rem', border: '1px solid #eee', borderRadius: '6px', color: '#aaa', fontSize: '0.82rem' }}>Carregando...</div>
            ) : (
              <select value={selectedId} onChange={e => setSelectedId(e.target.value)} style={selSt}>
                <option value="">— Selecione um técnico —</option>
                {filteredTechs.map(t => (
                  <option key={t.id} value={t.id}>{t.name}{t.supervisor_name ? ` (${t.supervisor_name})` : ''}</option>
                ))}
              </select>
            )}
          </div>

          {selectedTech && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', paddingBottom: '0' }}>
              {hasDirty && (
                <button onClick={saveAll} style={{ padding: '0.65rem 1.1rem', background: 'var(--color-accent-cyan)', color: 'var(--color-bg-primary)', border: 'none', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '800', cursor: 'pointer', textTransform: 'uppercase', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>
                  Salvar Tudo
                </button>
              )}
              <button onClick={() => loadInventory(selectedId)} style={{ padding: '0.65rem 1rem', background: 'transparent', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.78rem', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                ↻ Recarregar
              </button>
            </div>
          )}
        </div>

        {(filterSup || filterRegion) && (
          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--color-border-light)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#888' }}>Filtros ativos:</span>
            {filterSup && (
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-bg-primary)', background: 'var(--color-accent-cyan)', padding: '0.15rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {filterSup}
                <button onClick={() => setFilterSup('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-bg-primary)', fontSize: '0.75rem', lineHeight: 1 }}>✕</button>
              </span>
            )}
            {filterRegion && (
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-bg-primary)', background: 'var(--color-accent-cyan)', padding: '0.15rem 0.5rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {filterRegion}
                <button onClick={() => setFilterRegion('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-bg-primary)', fontSize: '0.75rem', lineHeight: 1 }}>✕</button>
              </span>
            )}
            <button onClick={() => { setFilterSup(''); setFilterRegion(''); setSelectedId(''); }} style={{ fontSize: '0.72rem', color: 'var(--color-accent-cyan)', fontWeight: '700', background: 'none', border: 'none', cursor: 'pointer', marginLeft: '0.25rem', textDecoration: 'underline' }}>
              Limpar tudo
            </button>
          </div>
        )}
      </div>

      {selectedTech && (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Técnico</div>
            <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>{selectedTech.name}</div>
          </div>
          {selectedTech.supervisor_name && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Supervisor</div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{selectedTech.supervisor_name}</div>
            </div>
          )}
          {selectedTech.region && (
            <div>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Estado</div>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--color-text-secondary)', marginTop: '0.2rem' }}>{selectedTech.region}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Ferramentas em posse</div>
            <div style={{ fontWeight: '900', fontSize: '1rem', color: 'var(--color-text-primary)', marginTop: '0.2rem' }}>{totalFerramentas} / {inventory.length}</div>
          </div>
        </div>
      )}

      {!selectedId ? (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '4rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>
          {filteredTechs.length === 0 && (filterSup || filterRegion)
            ? 'Nenhum técnico ativo encontrado para os filtros selecionados.'
            : 'Selecione um técnico para visualizar e gerenciar suas ferramentas.'}
        </div>
      ) : loadingInv ? (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '4rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>
          Carregando ferramentas...
        </div>
      ) : (
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-light)' }}>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.68rem' }}>Ferramenta</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.68rem' }}>Em Posse</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.68rem' }}>Status</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.68rem' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item, idx) => {
                const qty = localQty[item.tool_id] ?? 0;
                const isDirtyItem = dirty[item.tool_id];
                const isSaving = saving[item.tool_id];
                const temFerramentas = qty > 0;

                return (
                  <tr key={item.tool_id} style={{ borderBottom: '1px solid var(--color-border-light)', background: isDirtyItem ? 'var(--color-bg-primary)' : idx % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)' }}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>{item.tool_name}</div>
                      {item.tool_notes && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', fontWeight: '600', marginTop: '0.2rem' }}>⚠ {item.tool_notes}</div>}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>
                      <QuantityControl value={qty} onChange={(v) => handleQtyChange(item.tool_id, v)} disabled={isSaving} />
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase',
                        color: temFerramentas ? 'var(--color-bg-primary)' : 'var(--color-text-primary)',
                        background: temFerramentas ? 'var(--color-accent-cyan)' : 'var(--color-bg-primary)',
                      }}>
                        {temFerramentas ? 'Em Posse' : 'Sem Ferramenta'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                      {isDirtyItem ? (
                        <button onClick={() => saveItem(item.tool_id)} disabled={isSaving}
                          style={{ padding: '0.35rem 0.75rem', background: 'var(--color-accent-cyan)', color: 'var(--color-bg-primary)', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                          {isSaving ? '...' : 'Salvar'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>{item.updated_at ? '✓ Salvo' : '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
