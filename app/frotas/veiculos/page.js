'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const COLORS = {
  bg: '#121212',
  surface: '#1a1a1a',
  surface2: '#222222',
  border: '#333333',
  accent: '#0369a1',
  success: '#059669',
  warning: '#d97706',
  danger: '#dc2626',
  text: '#ffffff',
  text2: '#cccccc',
  text3: '#888888'
};

export default function VeiculosPage() {
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    carregarVeiculos();
  }, []);

  async function carregarVeiculos() {
    try {
      const res = await fetch('/api/frotas');
      const dados = await res.json();
      if (dados.success) {
        setVeiculos(dados.data);
      }
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deletarVeiculo(id) {
    if (!confirm('Tem certeza que deseja deletar este veículo?')) return;
    try {
      const res = await fetch(`/api/frotas/${id}`, { method: 'DELETE' });
      const dados = await res.json();
      if (dados.success) {
        setVeiculos(veiculos.filter((v) => v.id !== id));
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar veículo');
    }
  }

  const veiculosFiltrados =
    filtroStatus === 'Todos'
      ? veiculos.filter((v) => v.placa.includes(busca.toUpperCase()) || v.modelo.toLowerCase().includes(busca.toLowerCase()))
      : veiculos.filter((v) => v.status === filtroStatus && (v.placa.includes(busca.toUpperCase()) || v.modelo.toLowerCase().includes(busca.toLowerCase())));

  const getBadgeColor = (status) => {
    const colors = {
      'Ativo': { bg: '#1a2e1a', text: '#4a9a4a', border: '#3a6a3a' },
      'Parado': { bg: '#222222', text: '#888888', border: '#333333' },
      'Manutenção': { bg: '#2a1a00', text: '#d97706', border: '#5a3500' },
      'Descartado': { bg: '#2a0a0a', text: '#dc2626', border: '#5a1a1a' }
    };
    return colors[status] || colors['Parado'];
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '2rem', fontFamily: "'Inter'" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: COLORS.text, margin: 0 }}>
              Veículos
            </h1>
            <p style={{ fontSize: '0.85rem', color: COLORS.text3, marginTop: '0.25rem' }}>
              {veiculosFiltrados.length} de {veiculos.length} veículos
            </p>
          </div>
          <Link href="/frotas/veiculos/novo">
            <button
              style={{
                padding: '0.75rem 1.5rem',
                background: COLORS.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              + Novo Veículo
            </button>
          </Link>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {/* Busca */}
          <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                position: 'absolute',
                left: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: COLORS.text3,
                pointerEvents: 'none'
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por placa ou modelo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.25rem',
                borderRadius: '8px',
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                color: COLORS.text,
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Status */}
          {['Todos', 'Ativo', 'Parado', 'Manutenção'].map((status) => (
            <button
              key={status}
              onClick={() => setFiltroStatus(status)}
              style={{
                padding: '0.5rem 1rem',
                background: filtroStatus === status ? COLORS.accent : COLORS.surface2,
                color: filtroStatus === status ? '#fff' : COLORS.text2,
                border: `1px solid ${filtroStatus === status ? COLORS.accent : COLORS.border}`,
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: '10px', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.text3 }}>
              Carregando veículos...
            </div>
          ) : veiculosFiltrados.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.text3 }}>
              Nenhum veículo encontrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: COLORS.surface2 }}>
                    {['Placa', 'Modelo', 'Ano', 'KM', 'Status', 'Manutenção', 'Ações'].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '1rem',
                          textAlign: 'left',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          color: COLORS.text3,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {veiculosFiltrados.map((veiculo) => {
                    const badgeColor = getBadgeColor(veiculo.status);
                    return (
                      <tr key={veiculo.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                        <td style={{ padding: '1rem', fontWeight: '700', color: COLORS.accent, fontFamily: "'JetBrains Mono'" }}>
                          {veiculo.placa}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2 }}>
                          {veiculo.modelo}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2 }}>
                          {veiculo.ano}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2, fontFamily: "'JetBrains Mono'" }}>
                          {veiculo.kmAtual.toLocaleString('pt-BR')}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <div
                            style={{
                              display: 'inline-block',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '20px',
                              fontSize: '0.8rem',
                              fontWeight: '600',
                              background: badgeColor.bg,
                              color: badgeColor.text,
                              border: `1px solid ${badgeColor.border}`
                            }}
                          >
                            {veiculo.status}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text3, fontSize: '0.85rem' }}>
                          {veiculo.ultimaManutencao
                            ? new Date(veiculo.ultimaManutencao).toLocaleDateString('pt-BR')
                            : '—'}
                        </td>
                        <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                          <Link href={`/frotas/veiculos/${veiculo.id}`}>
                            <button
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: COLORS.accent,
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                fontWeight: '600'
                              }}
                            >
                              Editar
                            </button>
                          </Link>
                          <button
                            onClick={() => deletarVeiculo(veiculo.id)}
                            style={{
                              padding: '0.4rem 0.8rem',
                              background: 'rgba(220,38,38,0.1)',
                              color: COLORS.danger,
                              border: `1px solid rgba(220,38,38,0.2)`,
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: '600'
                            }}
                          >
                            Deletar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
