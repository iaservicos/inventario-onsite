'use client';

import { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

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
      setError('E-mail ou senha invalidos.');
      setLoading(false);
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#f5f5f5',
    }}>
      {/* Painel esquerdo — cinza escuro profissional */}
      <div style={{
        flex: 0.4,
        minWidth: '320px',
        background: '#2d2d2d',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2.5rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grade sutil */}
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '300px' }}>
          {/* Logo Positivo */}
          <div style={{
            width: '100%',
            height: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '2rem',
            background: '#ffffff',
            borderRadius: '8px',
            padding: '0.5rem',
          }}>
            <img 
              src="/logo-positivo.png" 
              alt="Positivo Tecnologia" 
              style={{
                maxWidth: '90%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#f5f5f5', letterSpacing: '-0.02em', marginBottom: '0.5rem' }}>
            Inventário Onsite
          </h2>
          <p style={{ fontSize: '0.8125rem', color: '#b9b9b9', lineHeight: 1.6 }}>
            Sistema de inventário cíclico de peças técnicas
          </p>

          {/* Features */}
          <div style={{ marginTop: '2.5rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {[
              'Agendamento automático de inventários',
              'Integração com WhatsApp via GPT Maker',
              'Sincronização com Databricks em tempo real',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left' }}>
                <span style={{
                  fontSize: '0.625rem', fontWeight: '700', color: '#868e96',
                  background: '#444444', padding: '0.2rem 0.4rem',
                  borderRadius: '4px', flexShrink: 0, marginTop: '1px',
                  letterSpacing: '0.05em',
                }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span style={{ fontSize: '0.8rem', color: '#b9b9b9', lineHeight: 1.5 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito — claro */}
      <div style={{
        flex: 0.6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: '#f5f5f5',
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          border: '1px solid #e9ecef',
          borderRadius: '12px',
          padding: '2.5rem',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          animation: 'fadeUp 0.3s ease forwards',
        }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1a1a1a', letterSpacing: '-0.02em', marginBottom: '0.375rem' }}>
              Entrar na sua conta
            </h1>
            <p style={{ fontSize: '0.8125rem', color: '#5c5c5c' }}>
              Acesso restrito a usuários autorizados
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '500', color: '#444444' }}>
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

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '500', color: '#444444' }}>
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
                    position: 'absolute', right: '0.75rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none', border: 'none',
                    cursor: 'pointer', color: '#868e96', padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  {showPass ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '0.75rem 0.875rem',
                background: '#f5f5f5',
                border: '1px solid #d1d1d1',
                borderRadius: '7px',
                fontSize: '0.8rem',
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5c5c5c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className="login-btn" disabled={loading} style={{ marginTop: '0.5rem' }}>
              {loading && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              )}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#868e96', marginTop: '1.75rem' }}>
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
      <div style={{ color: '#5c5c5c', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        Carregando...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
