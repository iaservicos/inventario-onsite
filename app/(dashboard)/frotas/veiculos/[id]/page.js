'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';

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
      <>
        <PageHeader title="Carregando..." subtitle="" />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Carregando dados do veículo...</div>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <PageHeader title="Erro" subtitle="" />
        <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>Veículo não encontrado</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title={form.placa} subtitle={`${form.modelo} · ${form.ano}`} />

      <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '2rem', maxWidth: '600px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Placa */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                background: '#f9fafb',
                opacity: 0.6,
                fontFamily: "'JetBrains Mono'"
              }}
            />
          </div>

          {/* Modelo */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Marca */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Ano e KM */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Status e Combustível */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                Status
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
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
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
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
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                fontSize: '0.95rem',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
                resize: 'vertical'
              }}
            />
          </div>

          {/* Erro */}
          {erro && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid #dc2626', borderRadius: '6px', padding: '0.75rem', fontSize: '0.9rem', color: '#dc2626', fontWeight: '600' }}>
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
                  background: '#f3f4f6',
                  color: '#666',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
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
                background: salvando ? '#d1d5db' : '#0369a1',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
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
    </>
  );
}
