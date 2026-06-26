'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';

export default function EntregaFerramentalPage() {
  const { data: session } = useSession();
  const [technicians, setTechnicians] = useState([]);
  const [tools, setTools] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [loadingDeliveries, setLoadingDeliveries] = useState(true);

  const [techId, setTechId] = useState('');
  const [selectedTools, setSelectedTools] = useState({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const role = session?.user?.role;
  const canDeliver = ['admin', 'supervisor', 'analista_custo'].includes(role);

  useEffect(() => {
    Promise.all([
      fetch('/api/technicians').then(r => r.json()),
      fetch('/api/ferramental/tools').then(r => r.json()),
    ]).then(([techs, toolsList]) => {
      setTechnicians(Array.isArray(techs) ? techs : []);
      setTools(Array.isArray(toolsList) ? toolsList : []);
    }).finally(() => setLoadingData(false));
  }, []);

  const loadDeliveries = useCallback(async () => {
    setLoadingDeliveries(true);
    try {
      const res = await fetch('/api/ferramental/requests?status=entregue');
      const data = await res.json();
      setDeliveries(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Erro ao carregar entregas');
    } finally {
      setLoadingDeliveries(false);
    }
  }, []);

  useEffect(() => { loadDeliveries(); }, [loadDeliveries]);

  function toggleTool(id) {
    setSelectedTools(prev => {
      if (prev[id] !== undefined) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: 1 };
    });
  }

  function setQty(id, value) {
    const qty = Math.max(1, parseInt(value) || 1);
    setSelectedTools(prev => ({ ...prev, [id]: qty }));
  }

  const selectedCount = Object.keys(selectedTools).length;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!techId) { toast.error('Selecione o técnico'); return; }
    if (selectedCount === 0) { toast.error('Selecione ao menos uma ferramenta'); return; }

    setSubmitting(true);
    let errors = 0;
    try {
      for (const [toolId, quantity] of Object.entries(selectedTools)) {
        const res = await fetch('/api/ferramental/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technician_id:   parseInt(techId),
            tool_id:         parseInt(toolId),
            quantity,
            comment:         comment.trim() || null,
            direct_delivery: true,
          }),
        });
        if (!res.ok) errors++;
      }

      if (errors === 0) {
        toast.success(`${selectedCount} ferramenta${selectedCount > 1 ? 's entregues' : ' entregue'} com sucesso!`);
        setTechId('');
        setSelectedTools({});
        setComment('');
        loadDeliveries();
      } else {
        toast.error(`${errors} ferramenta(s) não puderam ser registradas.`);
      }
    } catch {
      toast.error('Erro de conexão');
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTech = technicians.find(t => t.id === parseInt(techId));

  const fieldStyle = {
    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
    background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)', color: 'var(--color-text-primary)',
    fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit',
  };
  const labelStyle = {
    fontSize: '0.72rem', color: 'var(--color-text-tertiary)', fontWeight: '800',
    textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '0.4rem',
  };

  return (
    <DashboardLayout title="Registrar Entrega" subtitle="Registre a entrega de ferramentas a um técnico">

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,2fr)', gap: '1.5rem', alignItems: 'start' }}>

        {/* Formulário de entrega */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-primary)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Nova Entrega
            </span>
          </div>

          {!canDeliver ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888', fontSize: '0.85rem' }}>
              Sem permissão para registrar entregas.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              <div>
                <label style={labelStyle}>Técnico *</label>
                <select
                  value={techId}
                  onChange={e => setTechId(e.target.value)}
                  required
                  style={{ ...fieldStyle, cursor: 'pointer' }}
                  disabled={loadingData}
                >
                  <option value="">
                    {loadingData ? 'Carregando...' : 'Selecione o técnico'}
                  </option>
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}{t.region ? ` — ${t.region}` : ''}
                    </option>
                  ))}
                </select>
                {selectedTech?.supervisor_name && (
                  <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.3rem', paddingLeft: '0.2rem' }}>
                    Supervisor: {selectedTech.supervisor_name}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>
                  Ferramentas e quantidades *
                  {selectedCount > 0 && (
                    <span style={{ marginLeft: '0.4rem', color: '#000', fontWeight: '900' }}>
                      ({selectedCount})
                    </span>
                  )}
                </label>

                {loadingData ? (
                  <div style={{ color: '#888', fontSize: '0.82rem', padding: '0.5rem 0' }}>Carregando...</div>
                ) : tools.length === 0 ? (
                  <div style={{ color: '#888', fontSize: '0.82rem', padding: '0.5rem 0' }}>Nenhuma ferramenta cadastrada.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {tools.map(tool => {
                      const isSelected = selectedTools[tool.id] !== undefined;
                      const qty = selectedTools[tool.id] ?? 1;
                      return (
                        <div
                          key={tool.id}
                          style={{
                            borderRadius: '8px',
                            background: isSelected ? '#f0f7f0' : 'var(--color-bg-tertiary)',
                            border: `1px solid ${isSelected ? '#4a8a4a' : 'var(--color-border-light)'}`,
                            overflow: 'hidden', transition: 'all 0.1s',
                          }}
                        >
                          {/* Linha de seleção */}
                          <button
                            type="button"
                            onClick={() => toggleTool(tool.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '0.7rem',
                              padding: '0.65rem 0.85rem', width: '100%',
                              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                            }}
                          >
                            <div style={{
                              width: '18px', height: '18px', borderRadius: '4px', flexShrink: 0,
                              background: isSelected ? 'var(--color-accent-cyan)' : 'transparent',
                              border: `2px solid ${isSelected ? 'var(--color-accent-cyan)' : 'var(--color-border-light)'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', color: 'var(--color-bg-primary)', fontWeight: '900',
                            }}>
                              {isSelected ? '✓' : ''}
                            </div>
                            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? 'var(--color-accent-cyan)' : 'var(--color-text-secondary)' }}>
                              {tool.name}
                            </div>
                          </button>

                          {/* Input de quantidade */}
                          {isSelected && (
                            <div
                              style={{ padding: '0 0.85rem 0.65rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.6rem' }}
                              onClick={e => e.stopPropagation()}
                            >
                              <span style={{ fontSize: '0.68rem', color: '#666', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>
                                Qtd:
                              </span>
                              <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)', borderRadius: '6px', overflow: 'hidden' }}>
                                <button
                                  type="button"
                                  onClick={() => setQty(tool.id, qty - 1)}
                                  style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '700' }}
                                >−</button>
                                <input
                                  type="number"
                                  min="1"
                                  value={qty}
                                  onChange={e => setQty(tool.id, e.target.value)}
                                  style={{ width: '44px', background: 'transparent', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.85rem', fontWeight: '800', textAlign: 'center', outline: 'none', fontFamily: 'inherit', padding: '0' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => setQty(tool.id, qty + 1)}
                                  style={{ width: '28px', height: '28px', background: 'transparent', border: 'none', color: 'var(--color-text-secondary)', fontSize: '0.95rem', cursor: 'pointer', fontWeight: '700' }}
                                >+</button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>Observação</label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Opcional..."
                  rows={2}
                  style={{ ...fieldStyle, resize: 'vertical', minHeight: '60px' }}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !techId || selectedCount === 0}
                style={{
                  width: '100%', padding: '0.85rem',
                  background: (submitting || !techId || selectedCount === 0) ? 'var(--color-border-light)' : 'var(--color-accent-cyan)',
                  color: (submitting || !techId || selectedCount === 0) ? 'var(--color-text-tertiary)' : 'var(--color-bg-primary)',
                  border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900',
                  cursor: (submitting || !techId || selectedCount === 0) ? 'not-allowed' : 'pointer',
                  textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'all 0.2s',
                }}
              >
                {submitting
                  ? 'REGISTRANDO...'
                  : selectedCount === 0
                  ? 'SELECIONE AS FERRAMENTAS'
                  : `CONFIRMAR ENTREGA${selectedCount > 1 ? ` (${selectedCount})` : ''}`}
              </button>
            </form>
          )}
        </div>

        {/* Histórico de entregas */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Histórico de Entregas
            </span>
            <button onClick={loadDeliveries} style={{ background: 'none', border: '1px solid var(--color-border-light)', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              ↻ Atualizar
            </button>
          </div>

          {loadingDeliveries ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Carregando...</div>
          ) : deliveries.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Nenhuma entrega registrada.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-primary)', borderBottom: '1px solid var(--color-border-light)' }}>
                    {['#', 'Técnico', 'Ferramenta', 'Qtd', 'Entregue por', 'Data'].map(h => (
                      <th key={h} style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.68rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deliveries.map((r, idx) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: idx % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}>
                      <td style={{ padding: '0.85rem 1.5rem', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>#{r.id}</td>
                      <td style={{ padding: '0.85rem 1.5rem', fontWeight: '700', color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                        {r.technician_name}
                        {r.technicians?.supervisor_name && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', fontWeight: '500' }}>
                            {r.technicians.supervisor_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)', maxWidth: '200px' }}>{r.tool_name}</td>
                      <td style={{ padding: '0.85rem 1.5rem', color: 'var(--color-text-primary)', fontWeight: '700', textAlign: 'center' }}>{r.quantity ?? '—'}</td>
                      <td style={{ padding: '0.85rem 1.5rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap' }}>{r.approved_by || '—'}</td>
                      <td style={{ padding: '0.85rem 1.5rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
