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
  warning: '#d97706',
  text: '#0f172a',
  text2: '#475569',
  text3: '#94a3b8',
  headerBg: '#0f172a'
};

export default function TecnicoDashboardPage() {
  const router = useRouter();
  const [tecnico, setTecnico] = useState(null);
  const [chamados, setChamados] = useState([]);
  const [ponto, setPonto] = useState(null);

  useEffect(() => {
    const session = localStorage.getItem('tecnicoSession');
    if (!session) {
      router.push('/tecnico');
      return;
    }

    const dados = JSON.parse(session);
    setTecnico(dados);
    carregarDados();
  }, [router]);

  async function carregarDados() {
    try {
      // Carrega chamados do técnico
      const resChamados = await fetch(`/api/tecnico/chamados?tecnicoId=1`);
      const dataChamados = await resChamados.json();
      if (dataChamados.success) {
        setChamados(dataChamados.data);
      }

      // Carrega ponto do dia
      const resPonto = await fetch(`/api/tecnico/ponto?tecnicoId=1&data=${new Date().toISOString().split('T')[0]}`);
      const dataPonto = await resPonto.json();
      if (dataPonto.success) {
        setPonto(dataPonto.data[0] || null);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    }
  }

  function handleLogout() {
    localStorage.removeItem('tecnicoSession');
    router.push('/tecnico');
  }

  if (!tecnico) return null;

  const chamadoHoje = chamados.filter((c) => c.statusChamado === 'Em Atendimento').length;
  const chamadoMes = chamados.length;

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '30px',
              height: '30px',
              background: `linear-gradient(135deg, ${COLORS.accent2}, ${COLORS.accent})`,
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <span style={{ fontSize: '1rem', fontWeight: '700', letterSpacing: '-0.02em' }}>
            Ener<span style={{ color: COLORS.accent2 }}>Fine</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${COLORS.accent2}, ${COLORS.accent})`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: '700'
              }}
            >
              {tecnico.nome
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()}
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{tecnico.nome}</span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              borderRadius: '6px',
              padding: '0.4rem 0.6rem',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: '600'
            }}
          >
            Sair
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.2rem 1rem 2.5rem' }}>
        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1.2rem' }}>
          <div
            style={{
              background: COLORS.accent,
              borderRadius: '10px',
              padding: '1rem',
              color: '#fff'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.8, marginBottom: '0.25rem' }}>
              ATP
            </div>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', lineHeight: 1.3 }}>SP-001</div>
          </div>

          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '10px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.text3, marginBottom: '0.25rem' }}>
              Hoje
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: COLORS.accent }}>
              {chamadoHoje}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, color: COLORS.text3, marginTop: '0.2rem' }}>chamados</div>
          </div>

          <div
            style={{
              background: COLORS.surface,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '10px',
              padding: '1rem'
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.text3, marginBottom: '0.25rem' }}>
              Mês
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: COLORS.accent }}>
              {chamadoMes}
            </div>
            <div style={{ fontSize: '0.75rem', opacity: 0.7, color: COLORS.text3, marginTop: '0.2rem' }}>Total</div>
          </div>
        </div>

        {/* Veículo Card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${COLORS.accent}, #0284c7)`,
            borderRadius: '10px',
            padding: '1rem',
            color: '#fff',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="3" width="15" height="13" />
            <path d="M16 8h4l3 3v5h-7V8z" />
            <circle cx="5.5" cy="18.5" r="2.5" />
            <circle cx="18.5" cy="18.5" r="2.5" />
          </svg>
          <div>
            <div style={{ fontSize: '1.2rem', fontWeight: '800', letterSpacing: '0.05em' }}>ABC-1234</div>
            <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.1rem' }}>Ford Transit · 2022</div>
          </div>
        </div>

        {/* Chamado Ativo */}
        {chamados.some((c) => c.statusChamado === 'Em Atendimento') && (
          <div
            style={{
              background: `linear-gradient(135deg, rgba(5,150,105,.12), rgba(5,150,105,.05))`,
              border: `1.5px solid rgba(5,150,105,.3)`,
              borderRadius: '10px',
              padding: '1.2rem',
              marginBottom: '1rem'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: COLORS.success }}>
                Em Atendimento
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.25rem 0.6rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: '600',
                  background: 'rgba(5,150,105,.1)',
                  color: COLORS.success
                }}
              >
                ● Ativo
              </span>
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: COLORS.success, marginBottom: '0.3rem' }}>
              {chamados.find((c) => c.statusChamado === 'Em Atendimento')?.numero}
            </div>
            <div
              style={{
                fontSize: '1.8rem',
                fontWeight: '800',
                color: COLORS.text,
                letterSpacing: '-0.02em',
                margin: '0.4rem 0'
              }}
            >
              00:45:30
            </div>
            <div style={{ fontSize: '0.85rem', color: COLORS.text3, marginBottom: '0.8rem' }}>
              Check-in: 10:30
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
              <button
                style={{
                  padding: '0.7rem',
                  background: COLORS.warning,
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Pausar
              </button>
              <button
                style={{
                  padding: '0.7rem',
                  background: 'rgba(220,38,38,.1)',
                  color: '#dc2626',
                  border: `1px solid rgba(220,38,38,.2)`,
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                Finalizar
              </button>
            </div>
          </div>
        )}

        {/* Menu de Ações */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
          <Link href="/tecnico/ponto">
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: COLORS.text }}>Ponto</div>
            </div>
          </Link>

          <Link href="/tecnico/chamados">
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '10px',
                padding: '1rem',
                cursor: 'pointer',
                textAlign: 'center'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="2" style={{ margin: '0 auto 0.5rem' }}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: COLORS.text }}>Chamados</div>
            </div>
          </Link>
        </div>

        {/* Histórico */}
        <div style={{ background: COLORS.surface, borderRadius: '10px', padding: '1.2rem', border: `1px solid ${COLORS.border}` }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: COLORS.text, marginBottom: '1rem' }}>
            Últimos Atendimentos
          </div>
          {chamados.slice(0, 3).map((chamado) => (
            <div
              key={chamado.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.75rem 0',
                borderBottom: `1px solid ${COLORS.border}`
              }}
            >
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: COLORS.text }}>
                  {chamado.numero}
                </div>
                <div style={{ fontSize: '0.75rem', color: COLORS.text3, marginTop: '0.2rem' }}>
                  {new Date(chamado.dataAbertura).toLocaleTimeString('pt-BR')}
                </div>
              </div>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '20px',
                  fontSize: '0.7rem',
                  fontWeight: '600',
                  background: chamado.statusChamado === 'Finalizado' ? 'rgba(5,150,105,.1)' : 'rgba(217,119,6,.1)',
                  color: chamado.statusChamado === 'Finalizado' ? COLORS.success : COLORS.warning
                }}
              >
                {chamado.statusChamado}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
