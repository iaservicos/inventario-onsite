'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/ui/PageHeader';

export default function PecasPage() {
  const { data: session, status } = useSession();
  const [technicians, setTechnicians] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [selectedTechName, setSelectedTechName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setError('');
    try {
      const res = await fetch(`/api/technician-items?technicianId=${selectedTech}`);
      const data = await res.json();
      if (res.ok) {
        setItems(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || 'Erro ao carregar peças');
        setItems([]);
      }
    } catch (err) {
      setError('Erro de conexão ao buscar peças');
      setItems([]);
    }
    setLoading(false);
  }

  function handleExportExcel() {
    if (items.length === 0) return;

    const rows = [['Código', 'Nome da Peça', 'Quantidade', 'Remessa']];
    items.forEach((item) => {
      rows.push([
        item.item_code,
        item.item_name,
        item.item_quantity || 0,
        item.item_num_remessa || '—'
      ]);
    });

    const ws = XLSX.utils.json_to_sheet(rows.slice(1), { header: rows[0] });
    ws['!cols'] = [
      { wch: 15 },
      { wch: 35 },
      { wch: 12 },
      { wch: 15 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças');

    const fileName = `pecas_${selectedTechName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  if (status === 'loading') {
    return <div style={{ padding: '2rem', color: '#000000', fontWeight: '600' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Peças por Técnico"
        subtitle="Visualização em tempo real das peças ativas no Datalake"
      />

      {error && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          borderRadius: '8px',
          color: '#b71c1c',
          fontSize: '0.875rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem' }}>
        <div style={{ flex: 1, minWidth: '300px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '800',
            color: '#000000',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em'
          }}>Selecionar Técnico</label>
          <select
            className="input"
            value={selectedTech}
            onChange={(e) => {
              setSelectedTech(e.target.value);
              const tech = technicians.find(t => String(t.id) === e.target.value);
              setSelectedTechName(tech?.name || '');
            }}
            style={{ height: '44px', fontSize: '0.95rem', fontWeight: '600' }}
          >
            <option value="">— Escolha um técnico —</option>
            {technicians.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
            ))}
          </select>
        </div>
        {selectedTech && items.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Excel
          </button>
        )}
      </div>

      {selectedTech && !loading && items.length > 0 && (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000' }}>
          <div style={{ padding: '1.5rem', background: '#f0f0f0', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '1.1rem', fontWeight: '900', color: '#000000' }}>
              Peças Ativas ({items.length})
            </div>
            <span style={{ fontSize: '0.8rem', color: '#333333', fontWeight: '700', background: '#ffffff', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid #d0d0d0' }}>
              Sincronizado com Datalake
            </span>
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '140px' }}>Código</th>
                  <th>Nome da Peça</th>
                  <th style={{ width: '120px' }}>Quantidade</th>
                  <th style={{ width: '140px' }}>Remessa</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <code style={{
                        background: '#f0f0f0',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: '#000000',
                        fontWeight: '800',
                        border: '1px solid #d0d0d0'
                      }}>
                        {item.item_code}
                      </code>
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', fontSize: '0.95rem' }}>
                      {item.item_name}
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', textAlign: 'center', fontSize: '1rem' }}>
                      {item.item_quantity || '—'}
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', fontSize: '0.9rem' }}>
                      {item.item_num_remessa || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedTech && loading && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: '#000000'
        }}>
          <div style={{
            display: 'inline-block',
            width: '36px',
            height: '36px',
            border: '3px solid #f0f0f0',
            borderTop: '3px solid #000000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem'
          }}></div>
          <p style={{ fontWeight: '700', fontSize: '1rem' }}>Buscando peças no Datalake...</p>
        </div>
      )}

      {selectedTech && !loading && items.length === 0 && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: '#333333',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0'
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <h3 style={{ fontSize: '1.1rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '800' }}>Nenhuma peça encontrada</h3>
          <p style={{ fontSize: '0.9rem', color: '#666666' }}>Este técnico não possui peças ativas no Datalake no momento.</p>
        </div>
      )}

      {!selectedTech && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: '#333333',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '900' }}>Nenhum técnico selecionado</h3>
          <p style={{ fontSize: '0.95rem', color: '#666666' }}>Selecione um técnico acima para visualizar as peças sincronizadas com o Datalake.</p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
