'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

export default function PecasPage() {
  const { data: session, status } = useSession();
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ item_code: '', item_name: '', unit: 'un' });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();
  

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/technicians')
        .then((r) => r.json())
        .then((d) => setTechnicians(Array.isArray(d) ? d.filter((t) => t.active) : []));
    }
  }, [status]);

  useEffect(() => {
    if (selectedTech) fetchItems();
  }, [selectedTech]);

async function fetchItems() {
  if (!selectedTech) return; // Evita erro se não houver técnico selecionado
  
  setLoading(true);
  try {
    const tech = technicians.find(t => t.id === selectedTech);
    
    // Usamos o nome que o Databricks reconhece (geralmente databricks_name ou name)
    // encodeURIComponent serve para lidar com espaços e acentos no nome
    const ident = tech.databricks_name || tech.name;
    const res = await fetch(`/api/technician-items?technicianId=${encodeURIComponent(ident)}`);
    
    const data = await res.json(); // Faltava esta linha!
    
    setItems(Array.isArray(data) ? data : []);
  } catch (err) {
    console.error("Erro ao buscar peças:", err);
    setItems([]);
  } finally {
    setLoading(false);
  }
}


  async function handleAddItem(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const res = await fetch('/api/technician-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id: selectedTech, items: [newItem] }),
    });
    if (res.ok) {
      setMsg('Peça adicionada.');
      setNewItem({ item_code: '', item_name: '', unit: 'un' });
      setShowAddForm(false);
      fetchItems();
    } else {
      const err = await res.json();
      setMsg(err.error || 'Erro ao adicionar');
    }
    setSaving(false);
  }

  async function handleToggleActive(item) {
    await fetch(`/api/technician-items/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !item.active }),
    });
    fetchItems();
  }

  async function handleImportCSV(e) {
    const file = e.target.files[0];
    if (!file) return;
    setMsg('Importando...');
    const text = await file.text();
    const lines = text.split('\n').filter((l) => l.trim());
    const parsed = [];
    for (const line of lines) {
      const cols = line.split(';').map((c) => c.trim().replace(/"/g, ''));
      if (cols.length < 2) continue;
      const [item_code, item_name, unit] = cols;
      if (item_code && item_name) {
        parsed.push({ item_code, item_name, unit: unit || 'un' });
      }
    }
    if (parsed.length === 0) {
      setMsg('Nenhuma peça válida encontrada no arquivo. Formato: código;nome;unidade');
      return;
    }
    const res = await fetch('/api/technician-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ technician_id: selectedTech, items: parsed }),
    });
    if (res.ok) {
      setMsg(`${parsed.length} peça(s) importada(s) com sucesso.`);
      fetchItems();
    } else {
      setMsg('Erro na importação.');
    }
    fileRef.current.value = '';
  }

  function handleExportCSV() {
    const rows = [['Código', 'Nome', 'Unidade', 'Ativo']];
    items.forEach((i) => rows.push([i.item_code, i.item_name, i.unit, i.active ? 'Sim' : 'Não']));
    const csv = rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const tech = technicians.find((t) => String(t.id) === String(selectedTech));
    a.download = `pecas_${tech?.name?.replace(/\s/g, '_') || selectedTech}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (status === 'loading') {
    return <div style={{ padding: '1.5rem', color: '#525252' }}>Carregando...</div>;
  }

  const canManage = ['admin', 'supervisor'].includes(session?.user?.role);
  const activeItems = items.filter((i) => i.active);
  const inactiveItems = items.filter((i) => !i.active);

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Peças por Técnico"
        subtitle="Gerencie o portfólio de peças que cada técnico deve contar no inventário"
      />

      {msg && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          color: '#d4d4d4',
          fontSize: '0.875rem',
        }}>
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={labelStyle}>Selecionar Técnico</label>
            <select
              className="input"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
            >
              <option value="">— Escolha um técnico —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} — {t.region}</option>
              ))}
            </select>
          </div>
          {selectedTech && canManage && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', paddingBottom: '0' }}>
              <button className="btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
                + Adicionar Peça
              </button>
              <label style={{
                background: '#1f1f1f',
                border: '1px solid #2a2a2a',
                borderRadius: '6px',
                color: '#a3a3a3',
                fontSize: '0.8rem',
                padding: '0.5rem 0.875rem',
                cursor: 'pointer',
              }}>
                Importar CSV
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleImportCSV} />
              </label>
              {items.length > 0 && (
                <button className="btn-secondary" onClick={handleExportCSV}>
                  Exportar CSV
                </button>
              )}
            </div>
          )}
        </div>

        {selectedTech && canManage && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#525252' }}>
            Formato do CSV para importação: <code style={{ background: '#1a1a1a', padding: '1px 6px', borderRadius: '3px' }}>código;nome;unidade</code> — uma peça por linha, sem cabeçalho.
          </div>
        )}
      </div>

      {showAddForm && selectedTech && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title" style={{ marginBottom: '1rem' }}>Nova Peça</div>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Código</label>
                <input
                  className="input"
                  required
                  value={newItem.item_code}
                  onChange={(e) => setNewItem({ ...newItem, item_code: e.target.value })}
                  placeholder="Ex: HD-001"
                />
              </div>
              <div>
                <label style={labelStyle}>Nome da Peça</label>
                <input
                  className="input"
                  required
                  value={newItem.item_name}
                  onChange={(e) => setNewItem({ ...newItem, item_name: e.target.value })}
                  placeholder="Ex: HD 500GB SATA"
                />
              </div>
              <div>
                <label style={labelStyle}>Unidade</label>
                <select
                  className="input"
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                >
                  <option value="un">un</option>
                  <option value="pc">pc</option>
                  <option value="cx">cx</option>
                  <option value="kg">kg</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTech && !loading && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div className="section-title">
              Peças Ativas ({activeItems.length})
            </div>
            {inactiveItems.length > 0 && (
              <span style={{ fontSize: '0.75rem', color: '#525252' }}>
                {inactiveItems.length} inativa(s)
              </span>
            )}
          </div>

          {activeItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#525252', fontSize: '0.875rem' }}>
              Nenhuma peça ativa. Adicione peças manualmente ou importe um CSV.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome da Peça</th>
                    <th>Unidade</th>
                    {canManage && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code style={{ background: '#1a1a1a', padding: '2px 6px', borderRadius: '3px', fontSize: '0.8rem', color: '#a3a3a3' }}>
                          {item.item_code}
                        </code>
                      </td>
                      <td style={{ color: '#f0f0f0', fontWeight: '500' }}>{item.item_name}</td>
                      <td style={{ color: '#737373', fontSize: '0.85rem' }}>{item.unit}</td>
                      {canManage && (
                        <td>
                          <button
                            onClick={() => handleToggleActive(item)}
                            style={{
                              background: '#1f1f1f',
                              border: '1px solid #2a2a2a',
                              borderRadius: '5px',
                              color: '#525252',
                              fontSize: '0.75rem',
                              padding: '3px 10px',
                              cursor: 'pointer',
                            }}
                          >
                            Desativar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inactiveItems.length > 0 && (
            <details style={{ marginTop: '1.5rem' }}>
              <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#525252', userSelect: 'none' }}>
                Ver peças inativas ({inactiveItems.length})
              </summary>
              <table className="table" style={{ marginTop: '0.75rem', opacity: 0.6 }}>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Unidade</th>
                    {canManage && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {inactiveItems.map((item) => (
                    <tr key={item.id}>
                      <td><code style={{ fontSize: '0.8rem', color: '#525252' }}>{item.item_code}</code></td>
                      <td style={{ color: '#525252' }}>{item.item_name}</td>
                      <td style={{ color: '#525252', fontSize: '0.85rem' }}>{item.unit}</td>
                      {canManage && (
                        <td>
                          <button
                            onClick={() => handleToggleActive(item)}
                            style={{
                              background: '#1f1f1f',
                              border: '1px solid #2a2a2a',
                              borderRadius: '5px',
                              color: '#a3a3a3',
                              fontSize: '0.75rem',
                              padding: '3px 10px',
                              cursor: 'pointer',
                            }}
                          >
                            Reativar
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </div>
      )}

      {selectedTech && loading && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#525252' }}>Carregando peças...</div>
      )}

      {!selectedTech && (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#525252', fontSize: '0.875rem' }}>
          Selecione um técnico acima para visualizar e gerenciar suas peças.
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '500',
  color: '#525252',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};
