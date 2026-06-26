'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/ui/PageHeader';

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

export default function PecasUsadasPage() {
  const { data: session, status } = useSession();

  const [technicians,      setTechnicians]      = useState([]);
  const [selectedTech,     setSelectedTech]     = useState('');
  const [selectedTechName, setSelectedTechName] = useState('');
  const [items,            setItems]            = useState([]);
  const [lastSync,         setLastSync]         = useState(null);
  const [loading,          setLoading]          = useState(false);
  const [syncing,          setSyncing]          = useState(false);
  const [error,            setError]            = useState('');
  const [syncMessage,      setSyncMessage]      = useState('');
  const [searchFilter,     setSearchFilter]     = useState('');
  const [filterSupervisor, setFilterSupervisor] = useState('');
  const [summaryMode,      setSummaryMode]      = useState(false);
  const [summaryData,      setSummaryData]      = useState(null);
  const [summaryLoading,   setSummaryLoading]   = useState(false);
  const [codeSearch,       setCodeSearch]       = useState('');
  const [codeResults,      setCodeResults]      = useState(null);
  const [codeLoading,      setCodeLoading]      = useState(false);
  const [exportingAll,     setExportingAll]     = useState(false);

  const canSeeSupervisor = ['admin', 'coordinator'].includes(session?.user?.role);
  const isAdmin = session?.user?.role === 'admin';

  const supervisors = useMemo(() => {
    const names = [...new Set(technicians.map(t => t.supervisor_name).filter(Boolean))];
    return names.sort();
  }, [technicians]);

  const techsForDropdown = useMemo(() => {
    if (!filterSupervisor) return technicians;
    return technicians.filter(t => t.supervisor_name === filterSupervisor);
  }, [technicians, filterSupervisor]);

  async function loadSupervisorSummary() {
    if (!filterSupervisor) return;
    setSummaryLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/technician-used-items/summary?supervisor=${encodeURIComponent(filterSupervisor)}`);
      const data = await res.json();
      if (res.ok) { setSummaryData(data); setSummaryMode(true); }
      else setError(data.error || 'Erro ao carregar resumo');
    } catch { setError('Erro de conexão'); }
    setSummaryLoading(false);
  }

  function handleSupervisorChange(sup) {
    setFilterSupervisor(sup);
    setSummaryMode(false);
    setSummaryData(null);
    setSelectedTech('');
    setSelectedTechName('');
    setItems([]);
    setSearchFilter('');
  }

  async function handleCodeSearch(e) {
    e.preventDefault();
    if (!codeSearch.trim()) return;
    setCodeLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/technician-used-items/by-code?code=${encodeURIComponent(codeSearch.trim())}`);
      const data = await res.json();
      if (res.ok) setCodeResults(data);
      else setError(data.error || 'Erro na busca');
    } catch { setError('Erro de conexão'); }
    setCodeLoading(false);
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/technicians')
        .then(r => r.json())
        .then(d => setTechnicians(Array.isArray(d) ? d.filter(t => t.active) : []));
    }
  }, [status]);

  useEffect(() => {
    if (selectedTech) fetchItems();
    else { setItems([]); setLastSync(null); }
  }, [selectedTech]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`/api/technician-used-items?technicianId=${selectedTech}`);
      const data = await res.json();

      if (res.ok) {
        const itemList = Array.isArray(data) ? data : (data.items || []);
        setItems(itemList);
        setLastSync(data.last_sync || null);
      } else {
        setError(data.error || 'Erro ao carregar peças usadas');
        setItems([]);
      }
    } catch {
      setError('Erro de conexão ao buscar peças usadas');
      setItems([]);
    }
    setLoading(false);
  }, [selectedTech]);

  async function handleManualSync() {
    if (syncing) return;
    setSyncing(true);
    setSyncMessage('');
    setError('');

    try {
      const res  = await fetch('/api/sync/pecas-usadas', {
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
        if (selectedTech) await fetchItems();
      } else {
        setSyncMessage(`✗ Erro na sincronização: ${data.error || 'Erro desconhecido'}`);
      }
    } catch {
      setSyncMessage('✗ Erro de conexão ao disparar sincronização');
    }

    setSyncing(false);
    setTimeout(() => setSyncMessage(''), 8000);
  }

  function handleExportExcel() {
    if (filteredItems.length === 0) return;

    const rows = [['Código', 'Nome da Peça', 'Quantidade', 'Remessa', 'ATP Centro', 'ATP Nome', 'Chamado', 'Encerramento', 'Status', 'Subgrupo']];
    filteredItems.forEach(item => {
      rows.push([
        item.item_code,
        item.item_name,
        item.item_quantity ?? '—',
        item.item_num_remessa || '—',
        item.atp_centro || '—',
        item.atp_nome || '—',
        item.chamado_consumo || '—',
        item.data_encerramento ? new Date(item.data_encerramento).toLocaleDateString('pt-BR') : '—',
        item.status_consumo || '—',
        item.item_subgroup || 'OUTROS',
      ]);
    });

    const ws = XLSX.utils.json_to_sheet(rows.slice(1), { header: rows[0] });
    ws['!cols'] = [{ wch: 15 }, { wch: 35 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Peças Usadas');

    const fileName = `pecas_usadas_${selectedTechName.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  function handleExportSummaryExcel() {
    if (!summaryData?.technicians?.length) return;

    const rows = [];
    summaryData.technicians.forEach(tech => {
      tech.items.forEach(item => {
        rows.push({
          'Técnico':      tech.name,
          'Região':       tech.region || '—',
          'Código':       item.item_code,
          'Nome':         item.item_name,
          'Quantidade':   item.item_quantity ?? '—',
          'Remessa':      item.item_num_remessa || '—',
          'Chamado':      item.chamado_consumo || '—',
          'Encerramento': item.data_encerramento ? new Date(item.data_encerramento).toLocaleDateString('pt-BR') : '—',
          'Status':       item.status_consumo || '—',
          'Subgrupo':     item.item_subgroup || 'OUTROS',
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo Supervisor');
    XLSX.writeFile(wb, `pecas_usadas_resumo_${filterSupervisor.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  async function handleExportAllExcel() {
    setExportingAll(true);
    setError('');
    try {
      const res = await fetch('/api/technician-used-items/export-all');
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Erro ao exportar');
        setExportingAll(false);
        return;
      }

      const data = await res.json();
      if (!data.technicians?.length) {
        setError('Nenhuma peça usada encontrada');
        setExportingAll(false);
        return;
      }

      const rows = [];
      data.technicians.forEach(tech => {
        tech.items.forEach(item => {
          rows.push({
            'Técnico':      tech.name,
            'Supervisor':   tech.supervisor_name || '—',
            'Região':       tech.region || '—',
            'Código':       item.item_code,
            'Nome':         item.item_name,
            'Quantidade':   item.item_quantity ?? '—',
            'Remessa':      item.item_num_remessa || '—',
            'ATP Centro':   item.atp_centro || '—',
            'ATP Nome':     item.atp_nome || '—',
            'Chamado':      item.chamado_consumo || '—',
            'Encerramento': item.data_encerramento ? new Date(item.data_encerramento).toLocaleDateString('pt-BR') : '—',
            'Status':       item.status_consumo || '—',
            'Subgrupo':     item.item_subgroup || 'OUTROS',
          });
        });
      });

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 35 },
        { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 },
        { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 15 }
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Todas as Peças');
      XLSX.writeFile(wb, `pecas_usadas_completo_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (err) {
      setError('Erro de conexão ao exportar');
    }
    setExportingAll(false);
  }

  const filteredItems = items.filter(item => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      (item.item_code || '').toLowerCase().includes(q) ||
      (item.item_name || '').toLowerCase().includes(q) ||
      (item.item_subgroup || '').toLowerCase().includes(q)
    );
  });

  if (status === 'loading') {
    return <div style={{ padding: '2rem', color: '#000', fontWeight: '600' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '2rem', width: '100%' }}>

      <PageHeader
        title="Peças Usadas"
        subtitle="Dados sincronizados diariamente às 08h"
      />

      {/* Banner de última atualização */}
      <div style={{
        marginBottom: '1.5rem',
        padding: '0.75rem 1.25rem',
        background: 'var(--color-bg-tertiary)',
        border: '1px solid #ddd',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#333' }}>
          <IconDatabase />
          <span style={{ fontWeight: '700' }}>Fonte:</span>
          <span>Dados sincronizados do sistema</span>
          {lastSync?.formatted_at && (
            <>
              <span style={{ color: '#aaa', margin: '0 0.25rem' }}>·</span>
              <IconClock />
              <span>
                <strong>Última atualização:</strong> {lastSync.formatted_at}
              </span>
            </>
          )}
          {!lastSync && (
            <>
              <span style={{ color: '#aaa', margin: '0 0.25rem' }}>·</span>
              <span style={{ color: '#888', fontStyle: 'italic' }}>Aguardando primeira sincronização</span>
            </>
          )}
        </div>

        {session?.user?.role === 'admin' && (
          <button
            className="btn"
            onClick={handleManualSync}
            disabled={syncing}
            style={{ fontWeight: '700', whiteSpace: 'nowrap' }}
            title="Sincronizar agora (fora do horário automático das 08h)"
          >
            <IconRefresh spinning={syncing} />
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        )}
      </div>

      {/* Mensagem de resultado */}
      {syncMessage && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.6rem 0.75rem',
          background: 'var(--color-bg-tertiary)',
          border: '1px solid #000',
          borderRadius: '4px',
          fontSize: '0.8rem',
          fontWeight: '700',
          color: '#000',
        }}>
          {syncMessage}
        </div>
      )}

      {/* Erro */}
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

      {/* Seleção de técnico + filtro + exportar */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-end', gap: '1.5rem', flexWrap: 'wrap' }}>

        {/* Exportar Tudo (apenas admin) */}
        {isAdmin && !selectedTech && !filterSupervisor && (
          <button
            className="btn btn-primary"
            onClick={handleExportAllExcel}
            disabled={exportingAll}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px', whiteSpace: 'nowrap' }}
          >
            <IconDownload />
            {exportingAll ? 'Exportando...' : 'Exportar Tudo'}
          </button>
        )}

        {/* Supervisor (admin/coordinator) */}
        {canSeeSupervisor && (
          <div style={{ minWidth: '220px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#000', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Supervisor
            </label>
            <select
              className="input"
              value={filterSupervisor}
              onChange={e => handleSupervisorChange(e.target.value)}
              style={{ height: '44px', fontSize: '0.9rem', fontWeight: '600' }}
            >
              <option value="">— Todos —</option>
              {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div style={{ flex: 1, minWidth: '260px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
              setSummaryMode(false);
            }}
            style={{ height: '44px', fontSize: '0.95rem', fontWeight: '600' }}
          >
            <option value="">— Escolha um técnico —</option>
            {techsForDropdown.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.region})</option>
            ))}
          </select>
        </div>

        {selectedTech && items.length > 0 && (
          <div style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
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
          <button className="btn btn-primary" onClick={handleExportExcel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px' }}>
            <IconDownload />
            Exportar Excel
          </button>
        )}

        {canSeeSupervisor && filterSupervisor && !selectedTech && (
          <button
            onClick={loadSupervisorSummary}
            disabled={summaryLoading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px', padding: '0 1.25rem', background: summaryLoading ? '#e5e7eb' : '#111', color: summaryLoading ? '#6b7280' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: summaryLoading ? 'not-allowed' : 'pointer' }}
          >
            {summaryLoading ? 'Carregando...' : `Resumo — ${filterSupervisor}`}
          </button>
        )}

        {summaryMode && summaryData?.technicians?.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleExportSummaryExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '44px' }}
          >
            <IconDownload />
            Exportar Excel
          </button>
        )}

        {summaryMode && (
          <button onClick={() => { setSummaryMode(false); setSummaryData(null); }} style={{ height: '44px', padding: '0 1.25rem', background: 'transparent', border: '2px solid #000', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
            ← Voltar
          </button>
        )}
      </div>

      {/* Busca por código de peça */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#000', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          Buscar por Código de Peça
        </div>
        <form onSubmit={handleCodeSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input
            type="text"
            className="input"
            placeholder="Digite o código da peça..."
            value={codeSearch}
            onChange={e => { setCodeSearch(e.target.value); if (!e.target.value) setCodeResults(null); }}
            style={{ flex: 1, minWidth: '220px', height: '44px', fontWeight: '600', textTransform: 'uppercase' }}
          />
          <button type="submit" disabled={codeLoading || !codeSearch.trim()} style={{ height: '44px', padding: '0 1.25rem', background: codeLoading ? '#e5e7eb' : '#111', color: codeLoading ? '#6b7280' : '#fff', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: codeLoading ? 'not-allowed' : 'pointer' }}>
            {codeLoading ? 'Buscando...' : 'Buscar'}
          </button>
          {codeResults && (
            <button type="button" onClick={() => { setCodeResults(null); setCodeSearch(''); }} style={{ height: '44px', padding: '0 1rem', background: 'transparent', border: '2px solid #000', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
              Limpar
            </button>
          )}
        </form>
      </div>

      {/* Resumo do supervisor */}
      {summaryMode && summaryData && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1rem', fontWeight: '900', color: '#000', marginBottom: '1rem' }}>
            Resumo — {filterSupervisor}
          </div>

          {summaryData.technicians?.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666', background: '#f9f9f9', borderRadius: '10px', border: '2px dashed #d0d0d0', fontWeight: '600' }}>
              Nenhum técnico ativo com peças usadas para este supervisor.
            </div>
          )}

          {summaryData.technicians?.map(tech => (
            <div key={tech.id} className="card" style={{ padding: 0, border: '2px solid #000', marginBottom: '1.25rem' }}>
              <div style={{ padding: '0.85rem 1.25rem', background: '#111', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: '900', fontSize: '0.9rem', color: '#fff' }}>{tech.name}</span>
                {tech.region && <span style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: '600' }}>{tech.region}</span>}
                <span style={{ marginLeft: 'auto', background: '#fff', color: '#000', borderRadius: '10px', padding: '1px 10px', fontSize: '0.75rem', fontWeight: '800' }}>
                  {tech.items.length} peça(s)
                </span>
              </div>
              <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: '120px' }}>Código</th>
                      <th>Nome da Peça</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                      <th style={{ width: '130px' }}>Chamado</th>
                      <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                      <th style={{ width: '120px' }}>Subgrupo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tech.items.map((item, idx) => (
                      <tr key={`${item.item_code}-${idx}`}>
                        <td><code style={{ background: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid #d0d0d0' }}>{item.item_code}</code></td>
                        <td style={{ fontWeight: '700', fontSize: '0.9rem' }}>{item.item_name}</td>
                        <td style={{ fontWeight: '900', textAlign: 'center' }}>{item.item_quantity}</td>
                        <td style={{ fontSize: '0.85rem', color: '#333' }}>{item.chamado_consumo || '—'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {item.status_consumo && <span style={{ background: '#111', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '800' }}>{item.status_consumo}</span>}
                        </td>
                        <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>{item.item_subgroup || 'OUTROS'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resultados busca por código */}
      {codeResults && !summaryMode && (
        <div className="card" style={{ padding: 0, border: '2px solid #000', marginBottom: '2rem' }}>
          <div style={{ padding: '1.25rem 1.5rem', background: 'var(--color-bg-tertiary)', borderBottom: '2px solid #000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: '#000' }}>
              Busca: "{codeSearch.toUpperCase()}"
              <span style={{ marginLeft: '0.5rem', background: '#000', color: '#fff', borderRadius: '12px', padding: '2px 10px', fontSize: '0.8rem', fontWeight: '800' }}>{codeResults.total} resultado(s)</span>
              {codeResults.total > 0 && <span style={{ marginLeft: '0.5rem', color: '#555', fontSize: '0.8rem', fontWeight: '600' }}>Total: {codeResults.total_quantity} unidade(s)</span>}
            </div>
          </div>
          {codeResults.total === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#666', fontWeight: '600' }}>Nenhum técnico possui esta peça usada.</div>
          ) : (
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '120px' }}>Código</th>
                    <th>Nome da Peça</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                    <th style={{ width: '130px' }}>Chamado</th>
                    <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                    <th>Técnico</th>
                    <th style={{ width: '150px' }}>Supervisor</th>
                    <th style={{ width: '100px' }}>Região</th>
                  </tr>
                </thead>
                <tbody>
                  {codeResults.results.map((r, i) => (
                    <tr key={i}>
                      <td><code style={{ background: 'var(--color-bg-tertiary)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '800', border: '1px solid #d0d0d0' }}>{r.item_code}</code></td>
                      <td style={{ fontWeight: '700', fontSize: '0.95rem' }}>{r.item_name}</td>
                      <td style={{ fontWeight: '900', textAlign: 'center', fontSize: '1.05rem' }}>{r.item_quantity}</td>
                      <td style={{ fontWeight: '700', fontSize: '0.85rem' }}>{r.chamado_consumo || '—'}</td>
                      <td style={{ textAlign: 'center' }}>
                        {r.status_consumo && <span style={{ background: '#111', color: '#fff', borderRadius: '4px', padding: '2px 8px', fontSize: '0.72rem', fontWeight: '800' }}>{r.status_consumo}</span>}
                      </td>
                      <td style={{ fontWeight: '700' }}>{r.technician_name}</td>
                      <td style={{ fontSize: '0.85rem', color: '#444' }}>{r.supervisor_name || '—'}</td>
                      <td style={{ fontSize: '0.85rem', color: '#444' }}>{r.technician_region || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tabela de peças usadas */}
      {selectedTech && !loading && filteredItems.length > 0 && (
        <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid var(--color-text-primary)' }}>
          <div style={{
            padding: '1.25rem 1.5rem',
            background: 'var(--color-bg-tertiary)',
            borderBottom: '2px solid var(--color-text-primary)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}>
            <div style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--color-text-primary)' }}>
              Peças Usadas
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
                  background: 'var(--color-bg-primary)',
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
                color: 'var(--color-text-secondary)',
                fontWeight: '700',
                background: 'var(--color-bg-primary)',
                padding: '0.3rem 0.7rem',
                borderRadius: '6px',
                border: '1px solid #d0d0d0',
              }}>
                Sincronização de dados
              </span>
            </div>
          </div>

          <div className="table-wrapper" style={{ border: 'none', borderRadius: '0' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Código</th>
                  <th>Nome da Peça</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Qtd</th>
                  <th style={{ width: '130px' }}>Remessa</th>
                  <th style={{ width: '170px' }}>ATP</th>
                  <th style={{ width: '130px' }}>Chamado</th>
                  <th style={{ width: '120px' }}>Encerramento</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>Status</th>
                  <th style={{ width: '120px' }}>Subgrupo</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id}>
                    <td>
                      <code style={{
                        background: 'var(--color-bg-tertiary)',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        color: 'var(--color-text-primary)',
                        fontWeight: '800',
                        border: '1px solid #d0d0d0',
                      }}>
                        {item.item_code}
                      </code>
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '0.95rem' }}>
                      {item.item_name}
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700', textAlign: 'center', fontSize: '1rem' }}>
                      {item.item_quantity ?? '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                      {item.item_num_remessa || '—'}
                    </td>
                    <td>
                      <div style={{ color: 'var(--color-text-primary)', fontWeight: '800', fontSize: '0.85rem' }}>{item.atp_centro || '—'}</div>
                      <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.75rem', fontWeight: '600' }}>{item.atp_nome || '—'}</div>
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '0.85rem' }}>
                      {item.chamado_consumo || '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '0.85rem' }}>
                      {item.data_encerramento
                        ? new Date(item.data_encerramento).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {item.status_consumo ? (
                        <span style={{
                          background: '#111',
                          color: '#fff',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          letterSpacing: '0.03em',
                        }}>
                          {item.status_consumo}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ color: 'var(--color-text-primary)', fontWeight: '800', fontSize: '0.85rem' }}>
                      {item.item_subgroup || 'OUTROS'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loading */}
      {selectedTech && loading && (
        <div style={{ padding: '5rem 2rem', textAlign: 'center', color: 'var(--color-text-primary)' }}>
          <div style={{
            display: 'inline-block',
            width: '36px',
            height: '36px',
            border: '3px solid var(--color-bg-tertiary)',
            borderTop: '3px solid var(--color-text-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '1rem',
          }} />
          <p style={{ fontWeight: '700', fontSize: '1rem' }}>Buscando peças usadas...</p>
        </div>
      )}

      {/* Sem peças */}
      {selectedTech && !loading && items.length === 0 && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0',
        }}>
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-light)ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1rem' }}>
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          </svg>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: '800' }}>
            Nenhuma peça usada encontrada
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', marginBottom: '1rem' }}>
            Este técnico não possui peças usadas no banco local.
          </p>
          {lastSync ? (
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              Última sincronização: {lastSync.formatted_at}
            </p>
          ) : (
            <p style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
              As peças usadas ainda não foram sincronizadas. Use o botão "Sincronizar agora".
            </p>
          )}
        </div>
      )}

      {/* Filtro sem resultados */}
      {selectedTech && !loading && items.length > 0 && filteredItems.length === 0 && (
        <div style={{
          padding: '3rem 2rem',
          textAlign: 'center',
          color: 'var(--color-text-tertiary)',
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

      {/* Estado inicial */}
      {!selectedTech && (
        <div style={{
          padding: '5rem 2rem',
          textAlign: 'center',
          color: 'var(--color-text-secondary)',
          background: '#f9f9f9',
          borderRadius: '10px',
          border: '2px dashed #d0d0d0',
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--color-border-light)ccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '1.5rem' }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-primary)', marginBottom: '0.5rem', fontWeight: '900' }}>
            Nenhum técnico selecionado
          </h3>
          <p style={{ fontSize: '0.95rem', color: 'var(--color-text-tertiary)' }}>
            Selecione um técnico acima para visualizar as peças usadas.
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
