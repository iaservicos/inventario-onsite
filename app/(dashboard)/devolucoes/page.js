'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import * as XLSX from 'xlsx';
import PageHeader from '@/components/ui/PageHeader';

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export default function DevolucoesPage() {
  const { data: session, status } = useSession();

  const [technicians, setTechnicians]     = useState([]);
  const [selectedTech, setSelectedTech]   = useState('');
  const [items, setItems]                 = useState([]);
  const [loading, setLoading]             = useState(false);
  const [lastSync, setLastSync]           = useState(null);
  const [syncing, setSyncing]             = useState(false);
  const [syncMsg, setSyncMsg]             = useState('');
  const [filterStatus, setFilterStatus]   = useState('TODOS');

  const [filterSupervisor, setFilterSupervisor] = useState('');

  const [summaryMode, setSummaryMode]     = useState(false);
  const [summaryData, setSummaryData]     = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const role            = session?.user?.role;
  const canSeeAdmin     = role === 'admin' || role === 'coordinator';
  const canSync         = role === 'admin';

  useEffect(() => {
    fetch('/api/technicians?active=true')
      .then(r => r.json())
      .then(d => setTechnicians(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const supervisors = useMemo(
    () => [...new Set(technicians.map(t => t.supervisor_name).filter(Boolean))].sort(),
    [technicians]
  );

  const techsForDropdown = useMemo(
    () => filterSupervisor
      ? technicians.filter(t => t.supervisor_name === filterSupervisor)
      : technicians,
    [technicians, filterSupervisor]
  );

  const handleSupervisorChange = (sup) => {
    setFilterSupervisor(sup);
    setSelectedTech('');
    setItems([]);
    setSummaryMode(false);
    setSummaryData([]);
  };

  const loadItems = useCallback(async (techId) => {
    if (!techId) return;
    setLoading(true);
    setItems([]);
    try {
      const res = await fetch(`/api/technician-pending-returns?technicianId=${techId}`);
      const data = await res.json();
      setItems(data.items || []);
      setLastSync(data.last_sync || null);
    } catch {
      setItems([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (selectedTech) loadItems(selectedTech);
  }, [selectedTech, loadItems]);

  const handleShowSummary = async () => {
    if (!filterSupervisor) return;
    setSummaryMode(true);
    setSummaryLoading(true);
    setSummaryData([]);
    try {
      const res = await fetch(
        `/api/technician-pending-returns/summary?supervisor=${encodeURIComponent(filterSupervisor)}`
      );
      const data = await res.json();
      setSummaryData(data.technicians || []);
      setLastSync(data.last_sync || null);
    } catch {
      setSummaryData([]);
    }
    setSummaryLoading(false);
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync/devolucoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ triggered_by: 'manual' }),
      });
      const data = await res.json();
      if (res.ok) {
        setSyncMsg(`Sincronizado: ${data.total_gravado} registros`);
        if (selectedTech) loadItems(selectedTech);
      } else {
        setSyncMsg(`Erro: ${data.error}`);
      }
    } catch {
      setSyncMsg('Erro de conexão');
    }
    setSyncing(false);
  };

  const filteredItems = useMemo(() => {
    if (filterStatus === 'TODOS') return items;
    return items.filter(i => i.status_devolucao === filterStatus);
  }, [items, filterStatus]);

  const montadoCount = useMemo(() => items.filter(i => i.status_devolucao === 'MONTADO').length, [items]);
  const enviadoCount = useMemo(() => items.filter(i => i.status_devolucao === 'ENVIADO').length, [items]);
  const montadoLotes = useMemo(() => new Set(items.filter(i => i.status_devolucao === 'MONTADO').map(i => i.lote_dev_tecnico_id).filter(Boolean)).size, [items]);
  const enviadoLotes = useMemo(() => new Set(items.filter(i => i.status_devolucao === 'ENVIADO').map(i => i.lote_dev_tecnico_id).filter(Boolean)).size, [items]);
  const totalLotes   = useMemo(() => new Set(items.map(i => i.lote_dev_tecnico_id).filter(Boolean)).size, [items]);

  function handleExportExcel() {
    if (items.length === 0) return;

    const wb = XLSX.utils.book_new();

    const montadoLotes = new Set(items.filter(i => i.status_devolucao === 'MONTADO').map(i => i.lote_dev_tecnico_id)).size;
    const enviadoLotes = new Set(items.filter(i => i.status_devolucao === 'ENVIADO').map(i => i.lote_dev_tecnico_id)).size;
    const totalLotes   = new Set(items.map(i => i.lote_dev_tecnico_id)).size;
    const summaryRows = [
      ['Status', 'Qtd Lotes', 'Qtd Peças'],
      ['MONTADO', montadoLotes, montadoCount],
      ['ENVIADO', enviadoLotes, enviadoCount],
      ['TOTAL',   totalLotes,   items.length],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo');

    const techName = techsForDropdown.find(t => String(t.id) === selectedTech)?.name || selectedTech;
    const detailRows = items.map(i => ({
      'Técnico':         techName,
      'Lote':            i.lote_dev_tecnico_id || '—',
      'Código':          i.cod_peca || '—',
      'Descrição':       i.descr_peca || '—',
      'Status Lote':     i.status_devolucao || '—',
      'Tipo':            i.status_consumo || '—',
      'Data Montagem':   i.data_montagem_lote ? new Date(i.data_montagem_lote).toLocaleDateString('pt-BR') : '—',
      'Data Envio':      i.data_envio_lote    ? new Date(i.data_envio_lote).toLocaleDateString('pt-BR')    : '—',
      'Dias Aguardando': i.dias_aguardando ?? '—',
    }));
    const wsDetail = XLSX.utils.json_to_sheet(detailRows);
    wsDetail['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 35 }, { wch: 12 }, { wch: 8 }, { wch: 15 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsDetail, 'Detalhes');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `lotes_montados_${techName.replace(/\s/g, '_')}_${date}.xlsx`);
  }

  function handleExportSummaryExcel() {
    if (!summaryData.length) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = [['Técnico', 'Região', 'Montado (lotes)', 'Montado (peças)', 'Enviado (lotes)', 'Enviado (peças)', 'Total Peças', 'Max Dias']];
    summaryData.forEach(t => {
      summaryRows.push([t.name, t.region || '—', t.montado_lotes, t.montado_pecas, t.enviado_lotes, t.enviado_pecas, t.montado_pecas + t.enviado_pecas, t.max_dias ?? '—']);
    });
    const ws = XLSX.utils.aoa_to_sheet(summaryRows);
    ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Resumo');

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `lotes_resumo_${filterSupervisor.replace(/\s/g, '_')}_${date}.xlsx`);
  }

  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Carregando...</div>;
  }

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Lotes Montados"
        subtitle="Lotes de devolução montados ou enviados pelo técnico aguardando confirmação da ATP"
      />

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>

        {canSeeAdmin && (
          <div style={{ minWidth: '200px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.3rem' }}>
              Supervisor
            </label>
            <select
              value={filterSupervisor}
              onChange={e => handleSupervisorChange(e.target.value)}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">Todos os supervisores</option>
              {supervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}

        <div style={{ flex: 1, minWidth: '220px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.3rem' }}>
            Técnico
          </label>
          <select
            value={selectedTech}
            onChange={e => { setSelectedTech(e.target.value); setSummaryMode(false); }}
            className="input"
            style={{ width: '100%' }}
          >
            <option value="">— Selecione um técnico —</option>
            {techsForDropdown.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.region || '—'})</option>
            ))}
          </select>
        </div>

        {canSeeAdmin && filterSupervisor && (
          <button
            className="btn"
            onClick={handleShowSummary}
            disabled={summaryLoading}
            style={{ fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            {summaryLoading ? 'Carregando...' : 'Ver Resumo'}
          </button>
        )}

        {selectedTech && items.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleExportExcel}
            style={{ fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            Exportar Excel
          </button>
        )}

        {summaryMode && summaryData.length > 0 && (
          <button
            className="btn btn-primary"
            onClick={handleExportSummaryExcel}
            style={{ fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            Exportar Excel
          </button>
        )}

        {canSync && (
          <button
            className="btn"
            onClick={handleSync}
            disabled={syncing}
            style={{ fontWeight: '700', whiteSpace: 'nowrap' }}
          >
            {syncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
        )}
      </div>

      {syncMsg && (
        <div style={{
          padding: '0.6rem 0.75rem', background: '#f0f0f0', color: '#000',
          border: '1px solid #000', borderRadius: '4px', marginBottom: '1rem',
          fontSize: '0.8rem', fontWeight: '700',
        }}>
          {syncMsg}
        </div>
      )}

      {lastSync && (
        <p style={{ fontSize: '0.75rem', color: '#666', marginBottom: '1rem' }}>
          Última sincronização: {lastSync.formatted_at || lastSync.finished_at}
        </p>
      )}

      {summaryMode && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: '800', margin: 0 }}>
              Resumo — {filterSupervisor}
            </h2>
            <button
              className="btn"
              style={{ fontSize: '0.75rem' }}
              onClick={() => setSummaryMode(false)}
            >
              Fechar Resumo
            </button>
          </div>

          {summaryLoading ? (
            <div style={{ textAlign: 'center', padding: '2rem', fontWeight: '700' }}>Carregando...</div>
          ) : summaryData.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.85rem', border: '1px solid #eee', borderRadius: '8px' }}>
              Nenhum técnico com devoluções pendentes
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1.5rem' }}>
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Técnico</th>
                      <th>UF</th>
                      <th style={{ textAlign: 'center' }}>Montado<br /><span style={{ fontWeight: '400', fontSize: '0.62rem' }}>lotes / peças</span></th>
                      <th style={{ textAlign: 'center' }}>Enviado<br /><span style={{ fontWeight: '400', fontSize: '0.62rem' }}>lotes / peças</span></th>
                      <th style={{ textAlign: 'center' }}>Total peças</th>
                      <th style={{ textAlign: 'center' }}>Máx. Dias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summaryData.map(t => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: '800', color: '#000' }}>{t.name}</td>
                        <td><span className="badge badge-info">{t.region || '—'}</span></td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>
                          {t.montado_pecas > 0
                            ? <span className="badge badge-not-ok">{t.montado_lotes}L / {t.montado_pecas}P</span>
                            : <span style={{ color: '#999' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>
                          {t.enviado_pecas > 0
                            ? <span className="badge badge-info">{t.enviado_lotes}L / {t.enviado_pecas}P</span>
                            : <span style={{ color: '#999' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>{t.montado_pecas + t.enviado_pecas}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>
                          {t.max_dias > 0 ? `${t.max_dias}d` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!summaryMode && selectedTech && (
        <div>
          {!loading && (items.length > 0) && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Montado',  sub: 'aguardando envio', lotes: montadoLotes, pecas: montadoCount, accent: '#000' },
                { label: 'Enviado',  sub: 'aguardando ATP',   lotes: enviadoLotes, pecas: enviadoCount, accent: '#555' },
                { label: 'Total',    sub: 'pendentes',        lotes: totalLotes,   pecas: items.length,  accent: '#aaa' },
              ].map(c => (
                <div key={c.label} style={{
                  flex: 1, minWidth: '180px',
                  background: '#fff',
                  border: '1px solid #e8e8e8',
                  borderTop: `4px solid ${c.accent}`,
                  borderRadius: '6px',
                  padding: '1.1rem 1.25rem',
                }}>
                  <div style={{ marginBottom: '0.85rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: '800', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{c.label}</div>
                    <div style={{ fontSize: '0.62rem', color: '#bbb', marginTop: '1px', fontWeight: '500' }}>{c.sub}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0' }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '2rem', fontWeight: '900', color: '#000', lineHeight: 1 }}>{c.lotes}</div>
                      <div style={{ fontSize: '0.58rem', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem' }}>lotes</div>
                    </div>
                    <div style={{ width: '1px', height: '48px', background: '#ebebeb', marginBottom: '2px' }} />
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#444', lineHeight: 1 }}>{c.pecas}</div>
                      <div style={{ fontSize: '0.58rem', fontWeight: '700', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '0.3rem' }}>peças</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && items.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {['TODOS', 'MONTADO', 'ENVIADO'].map(s => (
                <button
                  key={s}
                  className={filterStatus === s ? 'btn btn-primary' : 'btn'}
                  style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.3rem 0.75rem' }}
                  onClick={() => setFilterStatus(s)}
                >
                  {s === 'TODOS' ? `Todos (${items.length})` : s === 'MONTADO' ? `Montado (${montadoCount})` : `Enviado (${enviadoCount})`}
                </button>
              ))}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando...</div>
          ) : filteredItems.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '3rem', color: '#666', fontSize: '0.85rem',
              border: '1px solid #eee', borderRadius: '8px',
            }}>
              {items.length === 0
                ? 'Nenhuma devolução pendente para este técnico'
                : 'Nenhum item para o filtro selecionado'}
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrapper" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Lote</th>
                      <th>Código</th>
                      <th>Descrição</th>
                      <th>Tipo</th>
                      <th>Data Montagem</th>
                      <th>Data Envio</th>
                      <th style={{ textAlign: 'center' }}>Dias Aguardando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item, idx) => (
                      <tr key={`${item.lote_dev_tecnico_id}-${item.cod_peca}-${idx}`}>
                        <td>
                          {item.status_devolucao === 'MONTADO'
                            ? <span className="badge badge-not-ok">MONTADO</span>
                            : <span className="badge badge-info">ENVIADO</span>
                          }
                        </td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.lote_dev_tecnico_id || '—'}</td>
                        <td style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>{item.cod_peca || '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>{item.descr_peca || '—'}</td>
                        <td>
                          {item.status_consumo
                            ? <span className="badge badge-info">{item.status_consumo}</span>
                            : '—'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>{formatDate(item.data_montagem_lote)}</td>
                        <td style={{ fontSize: '0.85rem' }}>{formatDate(item.data_envio_lote)}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700' }}>
                          {item.dias_aguardando != null ? `${item.dias_aguardando}d` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {!summaryMode && !selectedTech && (
        <div style={{
          textAlign: 'center', padding: '3rem', color: '#666', fontSize: '0.85rem',
          border: '1px solid #eee', borderRadius: '8px',
        }}>
          Selecione um técnico para visualizar as devoluções pendentes
        </div>
      )}
    </div>
  );
}
