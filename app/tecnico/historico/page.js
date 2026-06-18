'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const COLORS = {
  bg: '#f0f4f8',
  surface: '#fff',
  border: 'rgba(0,0,0,0.08)',
  accent: '#0369a1',
  accent2: '#0ea5e9',
  success: '#059669',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  headerBg: '#0f172a'
};

export default function TecnicoHistoricoPage() {
  const router = useRouter();
  const [tecnico, setTecnico] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [filtro, setFiltro] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const porPagina = 10;

  useEffect(() => {
    const session = localStorage.getItem('tecnicoSession');
    if (!session) {
      router.push('/tecnico');
      return;
    }

    const dados = JSON.parse(session);
    setTecnico(dados);
    carregarHistorico();
  }, [router]);

  async function carregarHistorico() {
    try {
      const res = await fetch('/api/tecnico/chamados?tecnicoId=1');
      const data = await res.json();
      if (data.success) {
        setHistorico(data.data.sort((a, b) => new Date(b.dataAbertura) - new Date(a.dataAbertura)));
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
    }
  }

  if (!tecnico) return null;

  const historicoFiltrado = historico.filter((h) =>
    h.numero.toLowerCase().includes(filtro.toLowerCase())
  );

  const totalPaginas = Math.ceil(historicoFiltrado.length / porPagina);
  const inicio = (paginaAtual - 1) * porPagina;
  const paginada = historicoFiltrado.slice(inicio, inicio + porPagina);

  const getStatusColor = (status) => {
    const cores = {
      'Finalizado': { bg: 'rgba(5,150,105,.1)', text: COLORS.success },
      'Em Atendimento': { bg: 'rgba(3,105,161,.1)', text: COLORS.accent },
      'Pausado': { bg: 'rgba(217,119,6,.1)', text: '#d97706' },
      'Aberto': { bg: 'rgba(148,163,184,.1)', text: COLORS.text3 }
    };
    return cores[status] || cores['Aberto'];
  };

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Header */}
      <div
        style={{
          background: COLORS.headerBg,
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.07)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link href="/tecnico/dashboard">
            <button
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: '#fff',
                borderRadius: '6px',
                padding: '0.5rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              ←
            </button>
          </Link>
          <h1 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>
            Histórico de Chamados
          </h1>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('tecnicoSession');
            router.push('/tecnico');
          }}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            borderRadius: '6px',
            padding: '0.4rem 0.8rem',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Sair
        </button>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.2rem 1rem 2rem' }}>
        {/* Busca */}
        <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
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
            placeholder="Filtrar por número…"
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value);
              setPaginaAtual(1);
            }}
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

        {/* Tabela */}
        <div style={{ background: COLORS.surface, borderRadius: '10px', overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
          {paginada.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.text3 }}>
              {historico.length === 0 ? 'Nenhum chamado registrado' : 'Nenhum resultado encontrado'}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${COLORS.border}`, background: '#f9fafb' }}>
                      {['Nº Chamado', 'Check-in', 'Check-out', 'Duração', 'Status'].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: '0.75rem',
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
                    {paginada.map((item) => {
                      const statusColor = getStatusColor(item.statusChamado);
                      const duracao = item.duracao ? `${item.duracao}min` : '—';

                      return (
                        <tr key={item.id} style={{ borderBottom: `1px solid ${COLORS.border}` }}>
                          <td style={{ padding: '0.75rem', fontWeight: '700', color: COLORS.accent, fontFamily: "'JetBrains Mono'" }}>
                            {item.numero}
                          </td>
                          <td style={{ padding: '0.75rem', color: COLORS.text2, fontSize: '0.8rem' }}>
                            {new Date(item.dataAbertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ padding: '0.75rem', color: COLORS.text2, fontSize: '0.8rem' }}>
                            {item.dataFechamento
                              ? new Date(item.dataFechamento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                              : '—'}
                          </td>
                          <td style={{ padding: '0.75rem', color: COLORS.text2, fontSize: '0.8rem', fontFamily: "'JetBrains Mono'" }}>
                            {duracao}
                          </td>
                          <td style={{ padding: '0.75rem' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '0.25rem 0.6rem',
                                borderRadius: '20px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                background: statusColor.bg,
                                color: statusColor.text
                              }}
                            >
                              {item.statusChamado}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div style={{ padding: '1rem', borderTop: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
                    <button
                      key={num}
                      onClick={() => setPaginaAtual(num)}
                      style={{
                        minWidth: '30px',
                        height: '30px',
                        padding: '0 0.5rem',
                        borderRadius: '6px',
                        border: `1px solid ${paginaAtual === num ? COLORS.accent : COLORS.border}`,
                        background: paginaAtual === num ? COLORS.accent : COLORS.surface,
                        color: paginaAtual === num ? '#fff' : COLORS.text2,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: '600'
                      }}
                    >
                      {num}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Info */}
        <div style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.8rem', color: COLORS.text3 }}>
          {historicoFiltrado.length} chamado{historicoFiltrado.length !== 1 ? 's' : ''} encontrado{historicoFiltrado.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}
