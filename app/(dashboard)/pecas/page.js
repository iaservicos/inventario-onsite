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
    else setItems([]);
  }, [selectedTech]);

  async function fetchItems() {
    setLoading(true);
    setMsg('');
    try {
      const res = await fetch(`/api/technician-items?technicianId=${selectedTech}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data) ? data : []);
      } else {
        setMsg(data.error || 'Erro ao carregar peças');
        setItems([]);
      }
    } catch (err) {
      setMsg('Erro de conexão ao buscar peças');
      setItems([]);
    }
    setLoading(false);
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
      setMsg('Peça adicionada com sucesso.');
      setNewItem({ item_code: '', item_name: '', unit: 'un' });
      setShowAddForm(false);
      fetchItems();
    } else {
      const err = await res.json();
      setMsg(err.error || 'Erro ao adicionar peça');
    }
    setSaving(false);
  }

  async function handleToggleActive(item) {
    if (item.from_databricks) {
      setMsg('Itens vindos do Databricks não podem ser desativados manualmente aqui.');
      return;
    }
    
    try {
      const res = await fetch(`/api/technician-items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !item.active }),
      });
      if (res.ok) {
        fetchItems();
      } else {
        setMsg('Erro ao alterar status da peça');
      }
    } catch (err) {
      setMsg('Erro de conexão');
    }
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
    const rows = [['Código', 'Nome', 'Unidade', 'Origem']];
    items.forEach((i) => rows.push([i.item_code, i.item_name, i.unit, i.from_databricks ? 'Databricks' : 'Manual']));
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
    return <div style={{ padding: '2rem', color: '#000000', fontWeight: '600' }}>Carregando...</div>;
  }

  const canManage = ['admin', 'supervisor'].includes(session?.user?.role);
  const activeItems = items.filter((i) => i.active !== false);
  const inactiveItems = items.filter((i) => i.active === false);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Peças por Técnico (Datalake)"
        subtitle="Visualização em tempo real das peças ativas no Databricks para o técnico selecionado"
      />

      {msg && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: msg.includes('Erro') ? '#ffebee' : '#f8f8f8',
          border: `1px solid ${msg.includes('Erro') ? '#ffcdd2' : '#e0e0e0'}`,
          borderRadius: '8px',
          color: msg.includes('Erro') ? '#b71c1c' : '#000000',
          fontSize: '0.875rem',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {msg}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '300px' }}>
            <label style={labelStyle}>Selecionar Técnico</label>
            <select
              className="input"
              value={selectedTech}
              onChange={(e) => setSelectedTech(e.target.value)}
              style={{ height: '42px', fontSize: '0.9rem' }}
            >
              <option value="">— Escolha um técnico para ver as peças do Datalake —</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
              ))}
            </select>
          </div>
          {selectedTech && canManage && (
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                + Adicionar Manual
              </button>
              <label className="btn-outline" style={{ cursor: 'pointer' }}>
                Importar CSV
                <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleImportCSV} />
              </label>
              {items.length > 0 && (
                <button className="btn-outline" onClick={handleExportCSV}>
                  Exportar CSV
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showAddForm && selectedTech && (
        <div className="card" style={{ marginBottom: '2rem', animation: 'fadeUp 0.3s ease' }}>
          <div style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1.25rem', color: '#000000' }}>Nova Peça Manual</div>
          <form onSubmit={handleAddItem}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
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
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Peça'}
              </button>
              <button type="button" className="btn-ghost" onClick={() => setShowAddForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTech && !loading && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f8f8' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#000000' }}>
              Peças Ativas no Datalake ({activeItems.length})
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
               <span className="badge badge-info">Sincronizado com Databricks</span>
               {inactiveItems.length > 0 && (
                <span style={{ fontSize: '0.8rem', color: '#666666', fontWeight: '600' }}>
                  {inactiveItems.length} inativa(s)
                </span>
              )}
            </div>
          </div>

          {activeItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#666666' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              <p style={{ fontSize: '1rem' }}>Nenhuma peça ativa encontrada para este técnico no Databricks.</p>
            </div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '180px' }}>Código</th>
                    <th>Nome da Peça</th>
                    <th style={{ width: '120px' }}>Unidade</th>
                    <th style={{ width: '150px' }}>Origem</th>
                    {canManage && <th style={{ width: '120px' }}>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <code style={{ background: '#f0f0f0', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', color: '#000000', fontWeight: '700' }}>
                          {item.item_code}
                        </code>
                      </td>
                      <td style={{ color: '#000000', fontWeight: '600', fontSize: '0.9rem' }}>{item.item_name}</td>
                      <td style={{ color: '#333333' }}>{item.unit}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          fontWeight: '700', 
                          textTransform: 'uppercase',
                          color: item.from_databricks ? '#0d47a1' : '#1b5e20',
                          background: item.from_databricks ? '#e3f2fd' : '#e8f5e9',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {item.from_databricks ? 'Datalake' : 'Manual'}
                        </span>
                      </td>
                      {canManage && (
                        <td>
                          {!item.from_databricks ? (
                            <button
                              onClick={() => handleToggleActive(item)}
                              className="btn-ghost"
                              style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#b71c1c' }}
                            >
                              Desativar
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.7rem', color: '#999999', fontStyle: 'italic' }}>Somente leitura</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {inactiveItems.length > 0 && (
            <div style={{ padding: '1.5rem', background: '#fafafa', borderTop: '1px solid #e0e0e0' }}>
              <details>
                <summary style={{ cursor: 'pointer', fontSize: '0.85rem', color: '#333333', fontWeight: '600', userSelect: 'none' }}>
                  Ver peças inativas ({inactiveItems.length})
                </summary>
                <div className="table-wrapper" style={{ marginTop: '1rem', opacity: 0.7 }}>
                  <table>
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
                          <td><code style={{ fontSize: '0.85rem', color: '#666666' }}>{item.item_code}</code></td>
                          <td style={{ color: '#666666' }}>{item.item_name}</td>
                          <td style={{ color: '#666666' }}>{item.unit}</td>
                          {canManage && (
                            <td>
                              <button
                                onClick={() => handleToggleActive(item)}
                                className="btn-ghost"
                                style={{ padding: '4px 8px', fontSize: '0.75rem', color: '#1b5e20' }}
                              >
                                Reativar
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {selectedTech && loading && (
        <div style={{ padding: '4rem', textAlign: 'center', color: '#000000' }}>
          <div style={{ 
            display: 'inline-block', 
            width: '30px', 
            height: '30px', 
            border: '3px solid #f3f3f3', 
            borderTop: '3px solid #000000', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ fontWeight: '600' }}>Buscando peças no Datalake...</p>
        </div>
      )}

      {!selectedTech && (
        <div style={{ 
          padding: '5rem 2rem', 
          textAlign: 'center', 
          color: '#666666', 
          background: '#f9f9f9',
          borderRadius: '12px',
          border: '2px dashed #e0e0e0'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', color: '#333333', marginBottom: '0.5rem' }}>Nenhum técnico selecionado</h3>
          <p style={{ fontSize: '0.9rem' }}>Selecione um técnico acima para visualizar as peças sincronizadas com o Databricks.</p>
        </div>
      )}
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#333333',
  marginBottom: '0.5rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
};
