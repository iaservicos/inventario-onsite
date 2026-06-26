'use client';

function IconLock() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function AccessDenied({ modulo = 'módulo' }) {
  return (
    <div style={{
      width: '100%',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg-primary)',
      padding: '2rem',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px',
      }}>
        <div style={{
          color: 'var(--color-accent)',
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'center',
        }}>
          <IconLock />
        </div>

        <h1 style={{
          fontSize: '2rem',
          fontWeight: '900',
          color: 'var(--color-text-primary)',
          marginBottom: '0.75rem',
          letterSpacing: '-0.02em',
        }}>
          Acesso Negado
        </h1>

        <p style={{
          fontSize: '1rem',
          color: 'var(--color-text-secondary)',
          marginBottom: '2rem',
          lineHeight: '1.6',
        }}>
          Você não tem permissão para acessar o <strong>{modulo}</strong>.
        </p>

        <p style={{
          fontSize: '0.85rem',
          color: 'var(--color-text-tertiary)',
          marginBottom: '2rem',
        }}>
          Se acredita que isso é um erro, entre em contato com o administrador do sistema.
        </p>

        <div style={{
          padding: '1.5rem',
          background: 'var(--color-bg-secondary)',
          border: '1.5px solid var(--color-border-light)',
          borderRadius: '12px',
          marginBottom: '2rem',
        }}>
          <p style={{
            fontSize: '0.75rem',
            color: 'var(--color-text-tertiary)',
            margin: '0.5rem 0',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontWeight: '700',
          }}>
            Módulo: <span style={{ color: 'var(--color-text-primary)' }}>{modulo}</span>
          </p>
        </div>

        <a href="/categorias" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, var(--color-accent) 0%, #0d9488 100%)',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '8px',
          fontWeight: '700',
          fontSize: '0.85rem',
          cursor: 'pointer',
          transition: 'all 0.25s ease',
          boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(20, 184, 166, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(20, 184, 166, 0.3)';
        }}>
          ← Voltar para Categorias
        </a>
      </div>
    </div>
  );
}
