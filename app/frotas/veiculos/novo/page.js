'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COLORS = {
  bg: '#121212',
  surface: '#1a1a1a',
  surface2: '#222222',
  border: '#333333',
  accent: '#0369a1',
  success: '#059669',
  danger: '#dc2626',
  text: '#ffffff',
  text2: '#cccccc',
  text3: '#888888'
};

export default function NovoVeiculoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({
    placa: '',
    modelo: '',
    ano: new Date().getFullYear(),
    marca: '',
    kmAtual: 0,
    status: 'Ativo',
    combustivel: 0,
    observacoes: ''
  });

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');

    // Validações
    if (!form.placa || !form.modelo || !form.marca) {
      setErro('Placa, modelo e marca são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/frotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const dados = await res.json();

      if (!dados.success) {
        setErro(dados.error || 'Erro ao criar veículo');
        return;
      }

      router.push('/frotas/veiculos');
    } catch (error) {
      setErro('Erro ao conectar com o servidor');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'ano' || name === 'kmAtual' || name === 'combustivel' ? parseInt(value) || 0 : value
    }));
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '2rem', fontFamily: "'Inter'" }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/frotas/veiculos">
            <button
              style={{
                background: 'none',
                border: 'none',
                color: COLORS.accent,
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '1rem'
              }}
            >
              ← Voltar
            </button>
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: COLORS.text, margin: 0 }}>
            Novo Veículo
          </h1>
          <p style={{ fontSize: '0.85rem', color: COLORS.text3, marginTop: '0.25rem' }}>
            Cadastre um novo veículo na frota
          </p>
        </div>

        {/* Form */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Placa */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Placa *
              </label>
              <input
                type="text"
                name="placa"
                placeholder="ABC-1234"
                value={form.placa}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: COLORS.surface2,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  fontFamily: "'JetBrains Mono'"
                }}
              />
            </div>

            {/* Modelo */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Modelo *
              </label>
              <input
                type="text"
                name="modelo"
                placeholder="Ford Transit"
                value={form.modelo}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: COLORS.surface2,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Marca */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Marca *
              </label>
              <input
                type="text"
                name="marca"
                placeholder="Ford"
                value={form.marca}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: COLORS.surface2,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Ano e KM */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Ano
                </label>
                <input
                  type="number"
                  name="ano"
                  value={form.ano}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: COLORS.surface2,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  KM Atual
                </label>
                <input
                  type="number"
                  name="kmAtual"
                  value={form.kmAtual}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: COLORS.surface2,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Status e Combustível */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Status
                </label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: COLORS.surface2,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                >
                  <option>Ativo</option>
                  <option>Parado</option>
                  <option>Manutenção</option>
                  <option>Descartado</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                  Combustível (L)
                </label>
                <input
                  type="number"
                  name="combustivel"
                  value={form.combustivel}
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    background: COLORS.surface2,
                    border: `1px solid ${COLORS.border}`,
                    color: COLORS.text,
                    fontSize: '0.95rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>
                Observações
              </label>
              <textarea
                name="observacoes"
                placeholder="Adicione observações sobre o veículo..."
                value={form.observacoes}
                onChange={handleChange}
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: COLORS.surface2,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            {/* Erro */}
            {erro && (
              <div style={{ background: 'rgba(220,38,38,0.1)', border: `1px solid ${COLORS.danger}`, borderRadius: '8px', padding: '0.75rem', fontSize: '0.9rem', color: COLORS.danger, fontWeight: '600' }}>
                {erro}
              </div>
            )}

            {/* Botões */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <Link href="/frotas/veiculos">
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '0.85rem',
                    background: COLORS.surface2,
                    color: COLORS.text2,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancelar
                </button>
              </Link>
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: loading ? '#555' : COLORS.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Criando...' : 'Criar Veículo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
