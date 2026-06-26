'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const FIELD_STYLE = {
  width: '100%',
  padding: '0.9rem 1.1rem',
  borderRadius: '10px',
  background: 'var(--color-bg-secondary)',
  border: '1px solid var(--color-border-default)',
  color: 'var(--color-text-primary)',
  fontSize: '0.95rem',
  fontWeight: '500',
  outline: 'none',
  fontFamily: 'inherit',
};

const LABEL_STYLE = {
  fontSize: '0.75rem',
  color: 'var(--color-text-tertiary)',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.5rem',
  display: 'block',
};

export default function SolicitarFerramentalPage() {
  const [tools, setTools] = useState([]);
  const [form, setForm] = useState({ technician_name: '', technician_email: '', comment: '' });
  // { [toolId]: quantity }
  const [selectedTools, setSelectedTools] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submittedTools, setSubmittedTools] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/ferramental/tools')
      .then(r => r.json())
      .then(data => setTools(data || []))
      .finally(() => setLoadingTools(false));
  }, []);

  function set(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  }

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
    setError('');
    if (selectedCount === 0) { setError('Selecione ao menos uma ferramenta.'); return; }

    setLoading(true);
    try {
      for (const [toolId, quantity] of Object.entries(selectedTools)) {
        const res = await fetch('/api/ferramental/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            technician_name:  form.technician_name.trim(),
            technician_email: form.technician_email.trim(),
            tool_id:          parseInt(toolId),
            quantity,
            comment:          form.comment.trim() || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || 'Erro ao enviar solicitação.'); return; }
      }
      setSubmittedTools(
        tools
          .filter(t => selectedTools[t.id] !== undefined)
          .map(t => ({ ...t, quantity: selectedTools[t.id] }))
      );
      setSubmitted(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const notesForSelected = tools.filter(t => selectedTools[t.id] !== undefined && t.notes);

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--color-bg-tertiary)', border: `2px solid var(--color-success)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
            Solicitação Enviada!
          </h2>
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            {submittedTools.length === 1
              ? <><strong style={{ color: 'var(--color-accent-cyan)' }}>{submittedTools[0].name}</strong> ({submittedTools[0].quantity} unidade{submittedTools[0].quantity > 1 ? 's' : ''}) foi registrada com sucesso.</>
              : <>{submittedTools.length} ferramentas solicitadas com sucesso.</>
            }
          </p>
          {submittedTools.length > 1 && (
            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
              {submittedTools.map(t => (
                <div key={t.id} style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', fontWeight: '600', padding: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: 'var(--color-success)' }}>✓</span> {t.name}
                  </span>
                  <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{t.quantity} un.</span>
                </div>
              ))}
            </div>
          )}
          <p style={{ color: 'var(--color-text-tertiary)', fontSize: '0.85rem', marginBottom: '2rem' }}>
            Sua solicitação será avaliada pelo seu gestor em breve.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ technician_name: '', technician_email: '', comment: '' }); setSelectedTools({}); setSubmittedTools([]); }}
            style={{ padding: '0.75rem 2rem', background: 'var(--color-accent-cyan)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s ease' }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
            Nova Solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: 'white', padding: '0.6rem 1.2rem', borderRadius: '8px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Image src="/logo-positivo.png" alt="Positivo Tecnologia" width={160} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-text-primary)', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Solicitação de Ferramental
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', fontWeight: '600' }}>IA SERVIÇOS — Portal Onsite</p>
        </div>

        {/* Card */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div>
              <label style={LABEL_STYLE}>Nome completo *</label>
              <input
                name="technician_name"
                value={form.technician_name}
                onChange={set}
                required
                placeholder="Seu nome completo"
                style={FIELD_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>E-mail corporativo *</label>
              <input
                name="technician_email"
                type="email"
                value={form.technician_email}
                onChange={set}
                required
                placeholder="nome@positivo.com.br"
                style={FIELD_STYLE}
              />
            </div>

            <div>
              <label style={LABEL_STYLE}>
                Ferramentas e quantidades *
                {selectedCount > 0 && (
                  <span style={{ marginLeft: '0.5rem', color: '#aaaaaa', textTransform: 'none', fontSize: '0.72rem' }}>
                    ({selectedCount} selecionada{selectedCount > 1 ? 's' : ''})
                  </span>
                )}
              </label>

              {loadingTools ? (
                <div style={{ ...FIELD_STYLE, color: '#666666' }}>Carregando ferramentas...</div>
              ) : tools.length === 0 ? (
                <div style={{ ...FIELD_STYLE, color: '#666666' }}>Nenhuma ferramenta disponível.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {tools.map(tool => {
                    const isSelected = selectedTools[tool.id] !== undefined;
                    const qty = selectedTools[tool.id] ?? 1;
                    return (
                      <div
                        key={tool.id}
                        style={{
                          borderRadius: '10px',
                          background: isSelected ? 'var(--color-bg-tertiary)' : 'var(--color-bg-secondary)',
                          border: `1px solid ${isSelected ? 'var(--color-success)' : 'var(--color-border-default)'}`,
                          overflow: 'hidden',
                          transition: 'all 0.15s',
                        }}
                      >
                        {/* Linha de seleção */}
                        <button
                          type="button"
                          onClick={() => toggleTool(tool.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '0.85rem',
                            padding: '0.85rem 1rem', width: '100%',
                            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                          }}
                        >
                          <div style={{
                            width: '20px', height: '20px', borderRadius: '5px', flexShrink: 0,
                            background: isSelected ? 'var(--color-success)' : 'transparent',
                            border: `2px solid ${isSelected ? 'var(--color-success)' : 'var(--color-text-tertiary)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', color: 'white', fontWeight: '900',
                          }}>
                            {isSelected ? '✓' : ''}
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: isSelected ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                            {tool.name}
                          </div>
                        </button>

                        {/* Input de quantidade (só aparece quando selecionado) */}
                        {isSelected && (
                          <div style={{ padding: '0 1rem 0.85rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}
                            onClick={e => e.stopPropagation()}>
                            <span style={{ fontSize: '0.72rem', color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>
                              Quantidade:
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0', background: '#111', borderRadius: '8px', border: '1px solid #444', overflow: 'hidden' }}>
                              <button
                                type="button"
                                onClick={() => setQty(tool.id, qty - 1)}
                                style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', color: '#aaa', fontSize: '1rem', cursor: 'pointer', fontWeight: '700' }}
                              >−</button>
                              <input
                                type="number"
                                min="1"
                                value={qty}
                                onChange={e => setQty(tool.id, e.target.value)}
                                style={{ width: '48px', background: 'transparent', border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: '800', textAlign: 'center', outline: 'none', fontFamily: 'inherit', padding: '0' }}
                              />
                              <button
                                type="button"
                                onClick={() => setQty(tool.id, qty + 1)}
                                style={{ width: '32px', height: '32px', background: 'transparent', border: 'none', color: '#aaa', fontSize: '1rem', cursor: 'pointer', fontWeight: '700' }}
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

            {/* Avisos de ferramentas selecionadas com notas */}
            {notesForSelected.map(t => (
              <div key={t.id} style={{ background: '#2a1a00', border: '1px solid #5a3500', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#ffaa44', fontWeight: '600', lineHeight: '1.5' }}>
                ⚠ <strong>{t.name}:</strong> {t.notes}
              </div>
            ))}

            <div>
              <label style={LABEL_STYLE}>Comentário</label>
              <textarea
                name="comment"
                value={form.comment}
                onChange={set}
                placeholder="Descreva o motivo da solicitação, estado da ferramenta atual, etc."
                rows={3}
                style={{ ...FIELD_STYLE, resize: 'vertical', minHeight: '80px' }}
              />
            </div>

            {error && (
              <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ff6666', fontWeight: '700' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingTools || selectedCount === 0}
              style={{
                width: '100%', padding: '1rem',
                background: (loading || selectedCount === 0) ? '#333' : 'var(--color-accent-cyan)',
                color: (loading || selectedCount === 0) ? '#666' : '#000',
                border: 'none', borderRadius: '8px', fontSize: '0.9rem', fontWeight: '900',
                cursor: (loading || selectedCount === 0) ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { if (!(loading || selectedCount === 0)) e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {loading
                ? 'ENVIANDO...'
                : selectedCount === 0
                ? 'SELECIONE AO MENOS UMA FERRAMENTA'
                : `ENVIAR SOLICITAÇÃO${selectedCount > 1 ? ` (${selectedCount})` : ''}`}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>
          DESENVOLVIDO POR <strong style={{ color: 'var(--color-accent-cyan)' }}>IA SERVIÇOS</strong>
        </p>
      </div>
    </div>
  );
}
