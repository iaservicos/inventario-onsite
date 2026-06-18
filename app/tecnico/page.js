'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const COLORS = {
  bg: '#f0f4f8',
  surface: '#fff',
  border: 'rgba(0,0,0,0.08)',
  accent: '#0369a1',
  success: '#059669',
  text: '#0f172a',
  text3: '#94a3b8',
  headerBg: '#0f172a'
};

export default function TecnicoLoginPage() {
  const [mat, setMat] = useState('');
  const [pass, setPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!mat || !pass) {
      setError('Preencha matrícula e senha.');
      return;
    }

    setLoading(true);
    try {
      // Mock auth - substituir com Firebase/real auth
      if (mat === '123456' && pass === 'senha123') {
        // Salvar sessão
        localStorage.setItem('tecnicoSession', JSON.stringify({ matricula: mat, nome: 'João Silva' }));
        router.push('/tecnico/dashboard');
      } else {
        setError('Matrícula ou senha incorreta.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: COLORS.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        fontFamily: "'Plus Jakarta Sans', sans-serif"
      }}
    >
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              background: `linear-gradient(135deg, ${COLORS.accent}, #0ea5e9)`,
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: `0 0 24px rgba(3, 105, 161, 0.35)`
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: COLORS.text, margin: '0 0 0.25rem' }}>
            EnerFine
          </h1>
          <p style={{ fontSize: '0.85rem', color: COLORS.text3, margin: '0.5rem 0 0' }}>
            Acesso Técnico de Campo
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '16px',
            padding: '2rem',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12)'
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Matrícula */}
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: COLORS.text3,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}
              >
                Matrícula
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Sua matrícula"
                value={mat}
                onChange={(e) => setMat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && document.getElementById('pass-input').focus()}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '9px',
                  background: '#f5f7fa',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(3, 105, 161, 0.12)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Senha */}
            <div>
              <label
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: COLORS.text3,
                  display: 'block',
                  marginBottom: '0.5rem'
                }}
              >
                Senha
              </label>
              <input
                id="pass-input"
                type="password"
                placeholder="Sua senha"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit(e)}
                style={{
                  width: '100%',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '9px',
                  background: '#f5f7fa',
                  border: `1px solid ${COLORS.border}`,
                  color: COLORS.text,
                  fontSize: '0.95rem',
                  fontWeight: '500',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 0.15s',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = COLORS.accent;
                  e.target.style.boxShadow = `0 0 0 3px rgba(3, 105, 161, 0.12)`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = COLORS.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Erro */}
            {error && (
              <div
                style={{
                  background: 'rgba(220,38,38,0.1)',
                  border: '1px solid rgba(220,38,38,0.2)',
                  borderRadius: '8px',
                  padding: '0.75rem 1rem',
                  fontSize: '0.85rem',
                  color: '#dc2626',
                  fontWeight: '600'
                }}
              >
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.9rem',
                background: COLORS.accent,
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo credentials */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '0.75rem',
              background: '#f5f7fa',
              borderRadius: '8px',
              fontSize: '0.75rem',
              color: COLORS.text3,
              textAlign: 'center'
            }}
          >
            <strong>Demo:</strong> 123456 / senha123
          </div>
        </div>
      </div>
    </div>
  );
}
