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
      background: '#121212',
      color: '#ffffff',
      padding: '2rem',
    }}>
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: '1200px',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '4rem',
      }}>
        
        {/* Lado Esquerdo - Branding */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}>
          {/* LOGO ESTILO HAAS: Container retangular branco com cantos arredondados */}
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{
              background: '#ffffff',
              padding: '0.75rem 1.5rem',
              borderRadius: '8px', // Cantos menos arredondados, estilo HaaS
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              width: '200px', // Largura fixa para manter o formato retangular
              height: '100px', // Altura fixa para o bloco
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}>
              <img 
                src="/logo-positivo.png" 
                alt="Positivo Tecnologia" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'contain' 
                }}
              />
            </div>
          </div>

          <h1 style={{ fontSize: '3.5rem', fontWeight: '900', marginBottom: '1rem', letterSpacing: '-0.04em' }}>
            Portal Onsite
          </h1>
          <p style={{ fontSize: '1.25rem', color: '#888888', marginBottom: '3rem', fontWeight: '500', maxWidth: '500px', lineHeight: '1.4' }}>
            Gestão geral de peças e performance dos técnicos
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {[
              'Gerenciamento centralizado',
              'Relatórios em tempo real',
              'Sincronização Databricks'
            ].map((item, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: '#ffffff', fontSize: '1.25rem', fontWeight: 'bold' }}>✓</span>
                <span style={{ color: '#aaaaaa', fontSize: '1.1rem', fontWeight: '600' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Direito - Card de Login */}
        <div style={{
          flexShrink: 0,
          width: '100%',
          maxWidth: '450px',
          background: '#1a1a1a',
          borderRadius: '24px',
          padding: '3.5rem 3rem',
          border: '1px solid #333333',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', textAlign: 'center', marginBottom: '2.5rem', color: '#ffffff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Acesso ao Sistema
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com.br"
                required
                style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '12px', background: '#222222', border: '1px solid #333333', color: '#ffffff', fontSize: '1rem', fontWeight: '500', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '0.8rem', color: '#888888', fontWeight: '800', textTransform: 'uppercase' }}>Senha</label>
                <button type="button" onClick={() => alert('Contate o administrador para resetar sua senha.')} style={{ background: 'none', border: 'none', color: '#666666', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '700', textDecoration: 'underline' }}>
                  Esqueci minha senha
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ width: '100%', padding: '1rem 1.25rem', borderRadius: '12px', background: '#222222', border: '1px solid #333333', color: '#ffffff', fontSize: '1rem', fontWeight: '500', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ color: '#ff4d4d', fontSize: '0.9rem', textAlign: 'center', fontWeight: '700' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '1.1rem', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: '900', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {loading ? 'AUTENTICANDO...' : 'ENTRAR NO PORTAL'}
            </button>
          </form>

          <div style={{ marginTop: '2.5rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#555555', fontWeight: '700', letterSpacing: '0.05em' }}>
              DESENVOLVIDO POR <strong style={{ color: '#888888' }}>IA SERVIÇOS</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#121212', height: '100vh' }}></div>}>
      <LoginForm />
    </Suspense>
  );
}