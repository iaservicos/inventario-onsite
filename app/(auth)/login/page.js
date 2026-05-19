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
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#121212', // Fundo escuro unificado
      backgroundImage: 'radial-gradient(circle at top right, #1e1e1e, #121212)',
      padding: '1.5rem',
    }}>
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: '#ffffff',
        borderRadius: '20px',
        padding: '3rem 2.5rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}>
        
        {/* Logo Area */}
        <div style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem',
        }}>
          <div style={{
            background: '#ffffff',
            padding: '1rem',
            borderRadius: '12px',
            border: '1px solid #f0f0f0',
            width: '100%',
            display: 'flex',
            justifyContent: 'center'
          }}>
            <img 
              src="/logo-positivo.png" 
              alt="Positivo Tecnologia" 
              style={{
                width: '240px',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        {/* Header Text */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ 
            fontSize: '1.75rem', 
            fontWeight: '900', 
            color: '#000000', 
            letterSpacing: '-0.03em', 
            marginBottom: '0.5rem',
            textTransform: 'uppercase'
          }}>
            Portal Onsite
          </h1>
          <p style={{ 
            fontSize: '0.875rem', 
            color: '#666666', 
            lineHeight: '1.5',
            fontWeight: '500'
          }}>
            Gestão geral de peças e performance dos técnicos
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Email Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              E-mail de Acesso
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#000000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>

          {/* Password Field */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Senha
              </label>
              <button 
                type="button"
                onClick={() => alert('Por favor, entre em contato com o administrador do sistema para resetar sua senha.')}
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  color: '#666666', 
                  fontSize: '0.7rem', 
                  fontWeight: '700', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Esqueci minha senha
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%',
                  padding: '0.875rem 1rem',
                  borderRadius: '10px',
                  border: '2px solid #e5e7eb',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  paddingRight: '3rem'
                }}
                onFocus={(e) => e.target.style.borderColor = '#000000'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                style={{
                  position: 'absolute', 
                  right: '1rem', 
                  top: '50%',
                  transform: 'translateY(-50%)', 
                  background: 'none', 
                  border: 'none',
                  cursor: 'pointer', 
                  color: '#999999',
                  fontSize: '0.7rem',
                  fontWeight: '800'
                }}
              >
                {showPass ? 'OCULTAR' : 'EXIBIR'}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              padding: '0.875rem',
              background: '#fef2f2',
              border: '1px solid #fee2e2',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#b91c1c',
              fontWeight: '600',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              marginTop: '1rem',
              width: '100%',
              padding: '1rem',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              fontSize: '0.9rem',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'transform 0.1s, opacity 0.2s',
              letterSpacing: '0.05em'
            }}
            onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
            onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
          >
            {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PORTAL'}
          </button>
        </form>

        <div style={{ marginTop: '3rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.7rem', color: '#999999', fontWeight: '700', letterSpacing: '0.05em' }}>
            IA SERVIÇOS & POSITIVO TECNOLOGIA
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
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        minHeight: '100vh',
        background: '#121212',
        color: '#ffffff',
        fontSize: '0.8rem',
        fontWeight: '700'
      }}>
        CARREGANDO...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}