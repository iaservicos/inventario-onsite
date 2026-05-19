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
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      background: '#0a0f1a', // Azul marinho muito escuro
      backgroundImage: 'radial-gradient(circle at center, #111a2e 0%, #0a0f1a 100%)',
      color: '#ffffff',
      overflow: 'hidden'
    }}>
      
      {/* Lado Esquerdo - Branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 10%',
        zIndex: 2
      }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            background: '#ffffff',
            padding: '0.75rem 1.5rem',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            <img 
              src="/logo-positivo.png" 
              alt="Positivo Tecnologia" 
              style={{ height: '40px', objectFit: 'contain' }}
            />
          </div>
        </div>

        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
          Portal Onsite
        </h1>
        <p style={{ fontSize: '1.1rem', color: '#94a3b8', marginBottom: '2.5rem', fontWeight: '400' }}>
          Gestão geral de peças e performance dos técnicos
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            'Gerenciamento centralizado',
            'Relatórios em tempo real',
            'Sincronização Databricks'
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ color: '#3b82f6', fontSize: '1.2rem', fontWeight: 'bold' }}>✓</span>
              <span style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: '500' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lado Direito - Card de Login */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        zIndex: 2
      }}>
        <div style={{
          width: '100%',
          maxWidth: '400px',
          background: 'rgba(30, 41, 59, 0.5)', // Transparência elegante
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '2.5rem',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            textAlign: 'center', 
            marginBottom: '2rem',
            color: '#ffffff'
          }}>
            Acesso ao Sistema
          </h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="exemplo@positivo.com.br"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '600' }}>Senha</label>
                <button 
                  type="button"
                  onClick={() => alert('Contate o administrador para resetar sua senha.')}
                  style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.75rem', cursor: 'pointer', fontWeight: '600' }}
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
                  padding: '0.75rem 1rem',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: 'none',
                  color: '#1e293b',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  outline: 'none'
                }}
              />
            </div>

            {error && (
              <div style={{ color: '#f87171', fontSize: '0.85rem', textAlign: 'center', fontWeight: '600' }}>
                {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              style={{ 
                width: '100%',
                padding: '0.75rem',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1d4ed8'}
              onMouseLeave={(e) => e.target.style.background = '#2563eb'}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ marginTop: '2rem', textAlign: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Sistema seguro desenvolvido por <strong style={{ color: '#cbd5e1' }}>IA Serviços</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Footer Copyright */}
      <div style={{
        position: 'absolute',
        bottom: '2rem',
        width: '100%',
        textAlign: 'center',
        fontSize: '0.7rem',
        color: '#475569',
        zIndex: 1
      }}>
        © 2026 Portal Onsite. Todos os direitos reservados.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0a0f1a', height: '100vh' }}></div>}>
      <LoginForm />
    </Suspense>
  );
}