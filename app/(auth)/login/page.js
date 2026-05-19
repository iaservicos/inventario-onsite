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
  const [showPass, setShowPass] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('E-mail ou senha inválidos.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      overflow: 'hidden',
    }}>
      {/* Painel esquerdo — fundo escuro com logo */}
      <div style={{
        flex: 0.45,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
        position: 'relative',
      }}>
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '340px' }}>
          {/* Logo Positivo */}
          <div style={{
            width: '100%',
            height: '80px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2.5rem',
            background: '#ffffff',
            borderRadius: '10px',
            padding: '1rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          }}>
            <img 
              src="/logo-positivo.png" 
              alt="Positivo Tecnologia" 
              style={{
                maxWidth: '95%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: '700', 
            color: '#ffffff', 
            letterSpacing: '-0.02em', 
            marginBottom: '0.75rem',
            lineHeight: 1.2,
          }}>
            Inventário Onsite
          </h2>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#e0e0e0', 
            lineHeight: 1.6,
            marginBottom: '2rem',
          }}>
            Sistema de inventário cíclico de peças técnicas
          </p>

          {/* Features */}
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              'Agendamento automático de inventários',
              'Integração com WhatsApp via GPT Maker',
              'Sincronização com Databricks em tempo real',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', textAlign: 'left' }}>
                <span style={{
                  fontSize: '0.7rem', 
                  fontWeight: '700', 
                  color: '#ffffff',
                  background: '#444444', 
                  padding: '0.3rem 0.5rem',
                  borderRadius: '4px', 
                  flexShrink: 0, 
                  marginTop: '2px',
                  letterSpacing: '0.05em',
                  minWidth: '24px',
                  textAlign: 'center',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#d0d0d0', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — formulário de login */}
      <div style={{
        flex: 0.55,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#ffffff',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: '12px',
          padding: '3rem',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.12)',
          animation: 'fadeUp 0.4s ease forwards',
        }}>
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ 
              fontSize: '1.375rem', 
              fontWeight: '700', 
              color: '#000000', 
              letterSpacing: '-0.02em', 
              marginBottom: '0.5rem' 
            }}>
              Entrar na sua conta
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#666666' }}>
              Acesso restrito a usuários autorizados
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333333' }}>
                E-mail
              </label>
              <input
                type="email"
                className="login-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                required
                autoComplete="email"
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '600', color: '#333333' }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'}
                  className="login-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingRight: '2.75rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', 
                    right: '0.875rem', 
                    top: '50%',
                    transform: 'translateY(-50%)', 
                    background: 'none', 
                    border: 'none',
                    cursor: 'pointer', 
                    color: '#999999', 
                    padding: 0,
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'color 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#333333'}
                  onMouseLeave={(e) => e.currentTarget.style.color = '#999999'}
                >
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.75rem' }}>
              <button 
                type="button"
                onClick={() => alert('Por favor, entre em contato com o administrador do sistema para resetar sua senha.')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#666666', 
                  fontSize: '0.75rem', 
                  fontWeight: '600', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Esqueci minha senha
              </button>
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: '#ffebee',
                border: '1px solid #ffcdd2',
                borderRadius: '7px',
                fontSize: '0.8125rem',
                color: '#b71c1c',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999999', marginTop: '2rem' }}>
            IA Serviços / Positivo Tecnologia
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        color: '#ffffff', 
        fontSize: '0.8rem', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
      }}>
        Carregando...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}