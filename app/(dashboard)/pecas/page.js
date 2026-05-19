'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/ui/PageHeader';

// ── Ícones inline (sem dependência extra) ─────────────────────────────────────
function IconDownload() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function IconRefresh({ spinning }) {
  return (
    <svg
      width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: spinning ? 'spin 1s linear infinite' : 'none' }}
    >
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconDatabase() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconError() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PecasPage() {
  const { data: session, status } = useSession();

  const [technicians,        setTechnicians]        = useState([]);
  const [selectedTech,       setSelectedTech]       = useState('');
  const [selectedTechName,   setSelectedTechName]   = useState('');
  const [items,              setItems]              = useState([]);
  const [lastSync,           setLastSync]           = useState(null);
  const [loading,            setLoading]            = useState(false);
  const [syncing,            setSyncing]            = useState(false);
  const [error,              setError]              = useState('');
  const [syncMessage,        setSyncMessage]        = useState('');
  const [searchFilter,       setSearchFilter]       = useState('');

  // Carrega técnicos ao autenticar
  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/technicians')
        .then(r => r.json())
        .then(d => setTechnicians(Array.isArray(d) ? d.filter(t => t.active) : []));
    }
  }, [status]);

  // Carrega peças ao selecionar técnico
  useEffect(() => {
    if (selectedTech) fetchItems();
    else { setItems([]); setLastSync(null); }
  }, [selectedTech]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/technician-items?technicianId=${selectedTech}`);
      const data = await res.json();

      if (res.ok) {
        // A API agora retorna { items, last_sync, total }
        const itemList = Array.isArray(data) ? data : (data.items || []);
        setItems(itemList);
        setLastSync(data.last_sync || null);
      } else {
        setError(data.error || 'Erro ao carregar peças');
        setItems([]);
      }
    } catch {
      setError('Erro de conexão ao buscar peças');
      setItems([]);
    }
    setLoading(false);
  }, [selectedTech]);

  // Dispara sincronização manual
  async function handleManualSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage('');
    setError('');

    try {
      const res  = await fetch('/api/sync/pecas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });
      const data = await res.json();

      if (res.status === 409) {
        setSyncMessage('⚠️ Já existe uma sincronização em andamento. Aguarde e recarregue.');
      } else if (res.ok && data.ok) {
        setSyncMessage(
          `✓ Sincronização concluída: ${data.items_upserted} peça(s) atualizadas em ${data.technicians_ok} técnico(s).`
        );
        // Recarrega as peças do técnico selecionado
        if (selectedTech) await fetchItems();
      } else {
        setSyncMessage(`✗ Erro na sincronização: ${data.error || 'Erro desconhecido'}`);
      }
    } catch {
      setSyncMessage('✗ Erro de conexão ao disparar sincronização');
    }

    setSyncing(false);
    // Limpa a mensagem após 8 segundos
    setTimeout(() => setSyncMessage(''), 8000);
  }

  function handleExportExcel() {
    if (filteredItems.length === 0) return;

    const rows = [['Subgrupo', 'Código', 'Nome da Peça', 'Quantidade', 'Remessa', 'ATP Centro', 'ATP Nome']];
    filteredItems.forEach(item => {
      rows.push([
        item.item_subgroup || '—',
        item.item_code,
        item.item_name,
        item.item_quantity ?? '—',
        item.item_num_remessa || '—',
        item.atp_centro || '—',
        item.atp_nome || '—',
      ]);
    });

    const ws = XLSX.utils.json_to_sheet(rows.slice(1), { header: rows[0] });
    ws['!cols'] = [{ wch: 15 }, { wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças');

    const fileName = `pecas_${selectedTechName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // Filtragem local por código ou nome ou subgrupo
  const filteredItems = items.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (item.item_code || '').toLowerCase().includes(q) ||
      (item.item_name || '').toLowerCase().includes(q) ||
      (item.item_subgroup || '').toLowerCase().includes(q)
    );
  });

  // ── Estados de carregamento ───────────────────────────────────────────────
  if (status === 'loading') {
    return <div style={{ padding: '2rem', color: '#000', fontWeight: '600' }}>Carregando...</div>;
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '2rem', width: '100%' }}>

      <PageHeader
        title="Peças Novas"
        subtitle="Dados sincronizados diariamente às 08h do Datalake"
      />

      {/* ── Banner de última atualização ─────────────────────────────────── */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem 1.25rem',
        background: '#f0f7ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#1e40af' }}>
          <IconDatabase />
          <span style={{ fontWeight: '700' }}>Fonte:</span>
          <span>Banco de dados local (sincronizado do Datalake)</span>
          {lastSync?.formatted_at && (
            <>
              <span style={{ color: '#93c5fd', margin: '0 0.25rem' }}>·</span>
              <IconClock />
              <span>
                <strong>Última atualização:</strong> {lastSync.formatted_at}
              </span>
            </>
          )}
          {!lastSync && (
            <>
              <span style={{ color: '#93c5fd', margin: '0 0.25rem' }}>·</span>
              <span style={{ color: '#6b7280', fontStyle: 'italic' }}>Aguardando primeira sincronização</span>
            </>
          )}
        </div>

        {session?.user?.role === 'admin' && (
          <button
            onClick={handleManualSync}
            disabled={syncing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.9rem',
              background: syncing ? '#e5e7eb' : '#1d4ed8',
              color: syncing ? '#6b7280' : '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: syncing ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
            title="Sincronizar agora (fora do horário automático das 08h)"
          >
            <IconRefresh spinning={syncing} />
            {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
          </button>
        )}
      </div>

      {/* ── Mensagem de resultado da sincronização manual ─────────────────── */}
      {syncMessage && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: syncMessage.startsWith('✓') ? '#f0fdf4' : '#fff7ed',
          border: `1px solid ${syncMessage.startsWith('✓') ? '#86efac' : '#fed7aa'}`,
          borderRadius: '6px',
          fontSize: '0.85rem',
          fontWeight: '600',
          color: syncMessage.startsWith('✓') ? '#166534' : '#9a3412',
        }}>
          {syncMessage}
        </div>
      )}

      {/* ── Erro ──────────────────────────────────────────────────────────── */}
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
          gap: '0.75rem',
        }}>
          <IconError />
          {error}
        </div>
      )}

      {/* ── Seleção de técnico + filtro + exportar ────────────────────────── */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '260px' }}>
          <label style={{
            display: 'block',
            fontSize: '0.75rem',
            fontWeight: '800',
            color: '#000000',
            marginBottom: '0.5rem',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            Selecionar Técnico
          </label>
          <select
            className="input"
            value={selectedTech}
            onChange={e => {
              setSelectedTech(e.target.value);
              const tech = technicians.find(t => String(t.id) === e.target.value);
              setSelectedTechName(tech?.name || '');
              setSearchFilter('');
            }}
            style={{ height: '44px', fontSize: '0.95rem', fontWeight: '600' }}
          >
            <option value="">— Escolha um técnico —</option>
            {technicians.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
            ))}
          </select>
        </div>

        {selectedTech && items.length > 0 && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{
              display: 'block',
              fontSize: '0.75rem',
              fontWeight: '800',
              color: '#000000',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Filtrar peças
            </label>
            <input
              type="text"
              className="input"
              placeholder="Código, nome ou subgrupo..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              style={{ height: '44px', fontSize: '0.9rem' }}
            />
          </div>
        )}

        {selectedTech && filteredItems.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleExportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px' }}
          >
            <IconDownload />
            Exportar Excel
          </button>
        )}
      </div>

      {/* ── Tabela de peças ───────────────────────────────────────────────── */}
      {selectedTech && !loading && filteredItems.length > 0 && (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            background: '#f0f0f0',
            borderBottom: '2px solid #000000',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#000000' }}>
              Peças Ativas
              <span style={{
                marginLeft: '0.5rem',
                background: '#000',
                color: '#fff',
                borderRadius: '12px',
                padding: '2px 10px',
                fontSize: '0.8rem',
                fontWeight: '800',
              }}>
                {filteredItems.length}
                {searchFilter && items.length !== filteredItems.length && ` de ${items.length}`}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {lastSync?.formatted_at && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.75rem',
                  color: '#1e40af',
                  background: '#ffffff',
                  padding: '0.3rem 0.7rem',
                  borderRadius: '6px',
                  border: '1px solid #bfdbfe',
                  fontWeight: '700',
                }}>
                  <IconClock />
                  Atualizado em {lastSync.formatted_at}
                </span>
              )}
              <span style={{
                fontSize: '0.75rem',
                color: '#333333',
                fontWeight: '700',
                background: '#ffffff',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #d0d0d0',
              }}>
                Datalake → Supabase
              </span>
            </div>
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Subgrupo</th>
                  <th style={{ width: '120px' }}>Código</th>
                  <th>Nome da Peça</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>Qtd</th>
                  <th style={{ width: '140px' }}>Remessa</th>
                  <th style={{ width: '180px' }}>ATP</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td style={{ color: '#000000', fontWeight: '800', fontSize: '0.85rem' }}>
                      {item.item_subgroup || 'OUTROS'}
                    </td>
                    <td>
                      <code style={{
                        background: '#f0f0f0',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: '#000000',
                        fontWeight: '800',
                        border: '1px solid #d0d0d0',
                      }}>
                        {item.item_code}
                      </code>
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', fontSize: '0.95rem' }}>
                      {item.item_name}
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', textAlign: 'center', fontSize: '1rem' }}>
                      {item.item_quantity ?? '—'}
                    </td>
                    <td style={{ color: '#000000', fontWeight: '700', fontSize: '0.9rem' }}>
                      {item.item_num_remessa || '—'}
                    </td>
                    <td>
                      <div style={{ color: '#000000', fontWeight: '800', fontSize: '0.85rem' }}>{item.atp_centro || '—'}</div>
                      <div style={{ color: '#666666', fontSize: '0.75rem', fontWeight: '600' }}>{item.atp_nome || '—'}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Loading ───────────────────────────────────────────────────────── */}
      {selectedTech && loading && (
        <div style={{ padding: '5rem 2rem', textAlign: 'center', color: '#000000' }}>
          <div style={{
            display: 'inline-block',
            width: '36px',
            height: '36px',
            border: '3px solid #f0f0f0',
            borderTop: '3px solid #000000',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem',
          }} />
          <p style={{ fontWeight: '700', fontSize: '1rem' }}>Buscando peças...</p>
        </div>
      )}

      {/* ── Sem peças ─────────────────────────────────────────────────────── */}
      {selectedTech && !loading && items.length === 0 && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: '#333333',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0',
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <h3 style={{ fontSize: '1.1rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '800' }}>
            Nenhuma peça encontrada
          </h3>
          <p style={{ fontSize: '0.9rem', color: '#666666', marginBottom: '1rem' }}>
            Este técnico não possui peças ativas no banco local.
          </p>
          {lastSync ? (
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Última sincronização com o Datalake: {lastSync.formatted_at}
            </p>
          ) : (
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              O banco ainda não foi sincronizado com o Datalake. Use o botão "Sincronizar agora".
            </p>
          )}
        </div>
      )}

      {/* ── Filtro sem resultados ─────────────────────────────────────────── */}
      {selectedTech && !loading && items.length > 0 && filteredItems.length === 0 && (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: '#666666',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0',
        }}>
          <p style={{ fontWeight: '700' }}>Nenhuma peça corresponde ao filtro "<strong>{searchFilter}</strong>"</p>
          <button
            onClick={() => setSearchFilter('')}
            style={{ marginTop: '0.75rem', color: '#1d4ed8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem' }}
          >
            Limpar filtro
          </button>
        </div>
      )}

      {/* ── Estado inicial (nenhum técnico selecionado) ───────────────────── */}
      {!selectedTech && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: '#333333',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', color: '#000000', marginBottom: '0.5rem', fontWeight: '900' }}>
            Nenhum técnico selecionado
          </h3>
          <p style={{ fontSize: '0.95rem', color: '#666666' }}>
            Selecione um técnico acima para visualizar as peças sincronizadas do Datalake.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}