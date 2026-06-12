'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

const FIELD_STYLE = {
  width: '100%',
  padding: '0.9rem 1.1rem',
  borderRadius: '10px',
  background: '#222222',
  border: '1px solid #333333',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: '500',
  outline: 'none',
  fontFamily: 'inherit',
};

const LABEL_STYLE = {
  fontSize: '0.75rem',
  color: '#888888',
  fontWeight: '800',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.5rem',
  display: 'block',
};

export default function SolicitarFerramentalPage() {
  const [tools, setTools] = useState([]);
  const [form, setForm] = useState({ technician_name: '', technician_email: '', tool_id: '', comment: '' });
  const [loading, setLoading] = useState(false);
  const [loadingTools, setLoadingTools] = useState(true);
  const [submitted, setSubmitted] = useState(false);
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.tool_id) { setError('Selecione uma ferramenta.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/ferramental/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_name:  form.technician_name.trim(),
          technician_email: form.technician_email.trim(),
          tool_id:          parseInt(form.tool_id),
          comment:          form.comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro ao enviar solicitação.'); return; }
      setSubmitted(true);
    } catch {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  const selectedTool = tools.find(t => t.id === parseInt(form.tool_id));

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#1a2e1a', border: '2px solid #2d5a2d', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#ffffff', marginBottom: '0.75rem' }}>
            Solicitação Enviada!
          </h2>
          <p style={{ color: '#888888', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '2rem' }}>
            Sua solicitação de <strong style={{ color: '#cccccc' }}>{selectedTool?.name || 'ferramenta'}</strong> foi registrada
            com sucesso e será avaliada pelo seu gestor em breve.
          </p>
          <button
            onClick={() => { setSubmitted(false); setForm({ technician_name: '', technician_email: '', tool_id: '', comment: '' }); }}
            style={{ padding: '0.8rem 2rem', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Nova Solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#121212', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ background: '#ffffff', padding: '0.6rem 1.2rem', borderRadius: '8px', display: 'inline-flex', justifyContent: 'center', alignItems: 'center', marginBottom: '1.5rem' }}>
            <Image src="/logo-positivo.png" alt="Positivo Tecnologia" width={160} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: '900', color: '#ffffff', letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
            Solicitação de Ferramental
          </h1>
          <p style={{ fontSize: '0.8rem', color: '#666666', fontWeight: '600' }}>IA SERVIÇOS — Portal Onsite</p>
        </div>

        {/* Card */}
        <div style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '2rem' }}>
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
              <label style={LABEL_STYLE}>Ferramenta solicitada *</label>
              {loadingTools ? (
                <div style={{ ...FIELD_STYLE, color: '#666666' }}>Carregando ferramentas...</div>
              ) : (
                <select
                  name="tool_id"
                  value={form.tool_id}
                  onChange={set}
                  required
                  style={{ ...FIELD_STYLE, cursor: 'pointer' }}
                >
                  <option value="">Selecione uma ferramenta</option>
                  {tools.map(tool => (
                    <option key={tool.id} value={tool.id}>
                      {tool.name}{tool.default_quantity > 1 ? ` (${tool.default_quantity} unidades)` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Aviso da mochila */}
            {selectedTool?.notes && (
              <div style={{ background: '#2a1a00', border: '1px solid #5a3500', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: '#ffaa44', fontWeight: '600', lineHeight: '1.5' }}>
                ⚠ {selectedTool.notes}
              </div>
            )}

            <div>
              <label style={LABEL_STYLE}>Comentário</label>
              <textarea
                name="comment"
                value={form.comment}
                onChange={set}
                placeholder="Descreva o motivo da solicitação, estado da ferramenta atual, etc."
                rows={4}
                style={{ ...FIELD_STYLE, resize: 'vertical', minHeight: '90px' }}
              />
            </div>

            {error && (
              <div style={{ background: '#2a0a0a', border: '1px solid #5a1a1a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ff6666', fontWeight: '700' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || loadingTools}
              style={{ width: '100%', padding: '1rem', background: loading ? '#333333' : '#ffffff', color: loading ? '#888888' : '#000000', border: 'none', borderRadius: '10px', fontSize: '0.9rem', fontWeight: '900', cursor: loading ? 'not-allowed' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em', transition: 'all 0.15s' }}
            >
              {loading ? 'ENVIANDO...' : 'ENVIAR SOLICITAÇÃO'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.7rem', color: '#444444', fontWeight: '700' }}>
          DESENVOLVIDO POR <strong style={{ color: '#666666' }}>IA SERVIÇOS</strong>
        </p>
      </div>
    </div>
  );
}
