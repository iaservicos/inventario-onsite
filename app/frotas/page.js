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

export default function FrotasPage() {
  const [frotas, setFrotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('Todos');

  useEffect(() => {
    carregarFrotas();
  }, []);

  async function carregarFrotas() {
    try {
      const res = await fetch('/api/frotas');
      const dados = await res.json();
      if (dados.success) {
        setFrotas(dados.data);
      }
    } catch (error) {
      console.error('Erro ao carregar frotas:', error);
    } finally {
      setLoading(false);
    }
  }

  const frotasFiltradas =
    filtroStatus === 'Todos'
      ? frotas
      : frotas.filter((f) => f.status === filtroStatus);

  const stats = {
    total: frotas.length,
    ativos: frotas.filter((f) => f.status === 'Ativo').length,
    manutencao: frotas.filter((f) => f.status === 'Manutenção').length,
    parados: frotas.filter((f) => f.status === 'Parado').length
  };

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
    <div style={{ minHeight: '100vh', background: COLORS.bg, padding: '2rem', fontFamily: "'Inter', system-ui" }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: '900', color: COLORS.text, margin: 0 }}>
              Gestão de Frotas
            </h1>
            <p style={{ fontSize: '0.85rem', color: COLORS.text3, marginTop: '0.25rem' }}>
              {frotasFiltradas.length} veículos
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

        {/* KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}
        >
          {[
            { label: 'Total', value: stats.total, color: COLORS.accent },
            { label: 'Ativos', value: stats.ativos, color: COLORS.success },
            { label: 'Manutenção', value: stats.manutencao, color: COLORS.warning },
            { label: 'Parados', value: stats.parados, color: COLORS.text3 }
          ].map((kpi) => (
            <div
              key={kpi.label}
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '1.25rem',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: COLORS.text3, fontWeight: '700', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: kpi.color, letterSpacing: '-0.05em' }}>
                {kpi.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                transition: 'all 0.15s'
              }}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Tabela de Veículos */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '10px',
            overflow: 'hidden'
          }}
        >
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.text3 }}>
              Carregando veículos...
            </div>
          ) : frotasFiltradas.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.text3 }}>
              Nenhum veículo encontrado
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: `1px solid ${COLORS.border}`,
                      background: COLORS.surface2
                    }}
                  >
                    {['Placa', 'Modelo', 'Ano', 'KM', 'Status', 'Última Manutenção', 'Ações'].map((header) => (
                      <th
                        key={header}
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
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {frotasFiltradas.map((frota) => {
                    const badgeColor = getBadgeColor(frota.status);
                    return (
                      <tr
                        key={frota.id}
                        style={{
                          borderBottom: `1px solid ${COLORS.border}`,
                          ':hover': { background: COLORS.surface2 }
                        }}
                      >
                        <td style={{ padding: '1rem', fontWeight: '700', color: COLORS.accent, fontFamily: "'JetBrains Mono'" }}>
                          {frota.placa}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2 }}>
                          {frota.modelo}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2 }}>
                          {frota.ano}
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text2, fontFamily: "'JetBrains Mono'" }}>
                          {frota.kmAtual.toLocaleString('pt-BR')}
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
                            {frota.status}
                          </div>
                        </td>
                        <td style={{ padding: '1rem', color: COLORS.text3, fontSize: '0.85rem' }}>
                          {new Date(frota.ultimaManutencao).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '1rem' }}>
                          <Link href={`/frotas/veiculos/${frota.id}`}>
                            <button
                              style={{
                                padding: '0.4rem 0.8rem',
                                background: COLORS.surface2,
                                color: COLORS.text2,
                                border: `1px solid ${COLORS.border}`,
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                cursor: 'pointer'
                              }}
                            >
                              Editar
                            </button>
                          </Link>
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
