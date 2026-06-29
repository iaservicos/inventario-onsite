'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else {
      fetch('/api/log-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'login' }),
      }).catch(() => {});
      router.push(callbackUrl);
    }
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: 'linear-gradient(135deg, #0f1419 0%, #0a1628 50%, #0d1825 100%)',
      color: 'var(--color-text-primary)',
      padding: '2rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Brasil 3D */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          backgroundImage: 'url(https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Captura%20de%20tela%202026-06-26%20171836.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          overflow: 'hidden',
          pointerEvents: 'none',
        }}>
        {/* Overlay escuro */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: `
              linear-gradient(135deg, rgba(15, 20, 25, 0.85) 0%, rgba(10, 22, 40, 0.8) 50%, rgba(13, 24, 37, 0.85) 100%)
            `,
            pointerEvents: 'none',
          }}
        />

        {/* Glow dinâmico */}
        <div
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            background: `
              radial-gradient(circle at 20% 20%, rgba(38, 208, 206, 0.25) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(38, 208, 206, 0.2) 0%, transparent 55%)
            `,
          }}
        />
      </div>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1200px',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4rem',
        position: 'relative',
        zIndex: 1,
      }}>
        
        {/* Lado Esquerdo - Branding */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          {/* LOGO ESTILO NEON */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.15) 0%, transparent 100%)',
              padding: '1.5rem 2rem',
              borderRadius: '14px',
              border: '1.5px solid rgba(38, 208, 206, 0.4)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '240px',
              height: '120px',
              boxShadow: '0 0 30px rgba(38, 208, 206, 0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.7)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(38, 208, 206, 0.35)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.2) 0%, transparent 100%)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.4)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(38, 208, 206, 0.2)';
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.15) 0%, transparent 100%)';
            }}>
              <img
                src="/logo-positivo.png"
                alt="Positivo Tecnologia"
                style={{
                  width: '90%',
                  height: 'auto',
                  objectFit: 'contain',
                  filter: 'brightness(1.1)',
                }}
              />
            </div>
          </div>

          <h1 style={{
            fontSize: '3.5rem',
            fontWeight: '900',
            marginBottom: '1rem',
            letterSpacing: '-0.04em',
            color: '#ffffff',
            textShadow: '0 2px 10px rgba(38, 208, 206, 0.3)',
          }}>
            Portal Onsite
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#a0aab5',
            marginBottom: '3rem',
            fontWeight: '500',
            maxWidth: '500px',
            lineHeight: '1.4',
            letterSpacing: '0.05em',
          }}>
            IA SERVIÇOS
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              'Gerenciamento centralizado',
              'Relatórios em tempo real',
              'Análise de desempenho'
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  color: '#26d0ce',
                  fontSize: '1.25rem',
                  fontWeight: 'bold',
                  filter: 'drop-shadow(0 0 8px rgba(38, 208, 206, 0.4))',
                }}>✓</span>
                <span style={{
                  color: '#e0e0e0',
                  fontSize: '1rem',
                  fontWeight: '600',
                  letterSpacing: '0.01em',
                }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Direito - Card de Login */}
        <div style={{
          flexShrink: 0,
          width: '100%',
          maxWidth: '450px',
          background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.95) 0%, rgba(25, 40, 55, 0.9) 100%)',
          backdropFilter: 'blur(40px)',
          borderRadius: '20px',
          padding: '3.5rem 3rem',
          border: '1.5px solid rgba(38, 208, 206, 0.35)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 40px rgba(38, 208, 206, 0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: '900',
            textAlign: 'center',
            marginBottom: '2.5rem',
            color: '#ffffff',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            textShadow: '0 2px 8px rgba(38, 208, 206, 0.2)',
          }}>
            Acesso ao Sistema
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(20, 30, 40, 0.8)',
                  border: '1.5px solid rgba(38, 208, 206, 0.25)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '500',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(38, 208, 206, 0.6)';
                  e.target.style.boxShadow = '0 0 20px rgba(38, 208, 206, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(38, 208, 206, 0.25)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontWeight: '800', textTransform: 'uppercase' }}>Senha</label>
                <button
                  type="button"
                  onClick={() => alert('Contate o administrador para resetar sua senha.')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#a0aab5',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '700',
                    textDecoration: 'none',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#26d0ce';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#a0aab5';
                  }}
                >
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '1rem 1.25rem',
                  borderRadius: '12px',
                  background: 'rgba(20, 30, 40, 0.8)',
                  border: '1.5px solid rgba(38, 208, 206, 0.25)',
                  color: '#ffffff',
                  fontSize: '1rem',
                  fontWeight: '500',
                  outline: 'none',
                  transition: 'all 0.3s ease',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = 'rgba(38, 208, 206, 0.6)';
                  e.target.style.boxShadow = '0 0 20px rgba(38, 208, 206, 0.2)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(38, 208, 206, 0.25)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {error && (
              <div style={{
                color: '#ff6b6b',
                fontSize: '0.9rem',
                textAlign: 'center',
                fontWeight: '700',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 107, 107, 0.1)',
                border: '1px solid rgba(255, 107, 107, 0.3)',
                borderRadius: '8px',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '1.1rem',
                background: loading ? 'rgba(38, 208, 206, 0.5)' : 'linear-gradient(135deg, #26d0ce 0%, #1db5ba 100%)',
                color: '#000000',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: '900',
                cursor: loading ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                transition: 'all 0.3s ease',
                boxShadow: '0 0 30px rgba(38, 208, 206, 0.4)',
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(38, 208, 206, 0.6)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(38, 208, 206, 0.4)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PORTAL'}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <p style={{
              fontSize: '0.7rem',
              color: '#8b95a5',
              fontWeight: '700',
              letterSpacing: '0.06em',
            }}>
              DESENVOLVIDO POR <strong style={{ color: '#26d0ce', textShadow: '0 0 10px rgba(38, 208, 206, 0.3)' }}>IA SERVIÇOS</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: 'var(--color-bg-primary)', height: '100vh' }}></div>}>
      <LoginForm />
    </Suspense>
  );
}