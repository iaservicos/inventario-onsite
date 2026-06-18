'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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

export default function EditarVeiculoPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(null);

  useEffect(() => {
    carregarVeiculo();
  }, [id]);

  async function carregarVeiculo() {
    try {
      const res = await fetch(`/api/frotas/${id}`);
      const dados = await res.json();

      if (dados.success) {
        setForm(dados.data);
      } else {
        setErro('Veículo não encontrado');
      }
    } catch (error) {
      setErro('Erro ao carregar veículo');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setSalvando(true);

    try {
      const res = await fetch(`/api/frotas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const dados = await res.json();

      if (!dados.success) {
        setErro(dados.error || 'Erro ao atualizar veículo');
        return;
      }

      router.push('/frotas/veiculos');
    } catch (error) {
      setErro('Erro ao conectar com o servidor');
      console.error('Erro:', error);
    } finally {
      setSalvando(false);
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'ano' || name === 'kmAtual' || name === 'combustivel' ? parseInt(value) || 0 : value
    }));
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.text3 }}>Carregando...</div>
      </div>
    );
  }

  if (!form) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: COLORS.danger }}>Veículo não encontrado</div>
      </div>
    );
  }

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
            {form.placa}
          </h1>
          <p style={{ fontSize: '0.85rem', color: COLORS.text3, marginTop: '0.25rem' }}>
            {form.modelo} · {form.ano}
          </p>
        </div>

        {/* Form */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '12px', padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Placa */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Placa
              </label>
              <input
                type="text"
                name="placa"
                value={form.placa}
                onChange={handleChange}
                disabled
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  background: COLORS.surface2,
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text3,
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  opacity: 0.6
                }}
              />
            </div>

            {/* Modelo */}
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Modelo
              </label>
              <input
                type="text"
                name="modelo"
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
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Marca
              </label>
              <input
                type="text"
                name="marca"
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
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: COLORS.text3, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Observações
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes || ''}
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
                disabled={salvando}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  background: salvando ? '#555' : COLORS.accent,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  cursor: salvando ? 'not-allowed' : 'pointer',
                  opacity: salvando ? 0.6 : 1
                }}
              >
                {salvando ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
