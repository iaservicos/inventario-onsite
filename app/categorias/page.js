'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';

function IconInventario() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconFerramental() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function IconFrotas() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" />
      <path d="M16 8h4l3 3v5h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconCadastro() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  );
}

function CategoriaCard({ titulo, descricao, icon: Icon, href, temAcesso }) {
  if (!temAcesso) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.7) 0%, rgba(25, 40, 55, 0.65) 100%)',
        backdropFilter: 'blur(20px)',
        border: '1.5px solid rgba(139, 149, 165, 0.3)',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        cursor: 'not-allowed',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        opacity: 0.6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ marginBottom: '0.5rem', color: '#8b95a5' }}>
          <Icon />
        </div>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '900',
          color: '#6e7681',
          margin: '0.5rem 0 0.25rem',
          letterSpacing: '-0.01em',
        }}>
          {titulo}
        </h3>
        <p style={{
          fontSize: '0.9rem',
          color: '#5a626a',
          margin: 0,
          lineHeight: '1.5',
        }}>
          Acesso não autorizado
        </p>
      </div>
    );
  }

  return (
    <Link href={href}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(30, 45, 64, 0.95) 0%, rgba(25, 40, 55, 0.9) 100%)',
        backdropFilter: 'blur(40px)',
        border: '1.5px solid rgba(38, 208, 206, 0.3)',
        borderRadius: '16px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(38, 208, 206, 0.08)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.7)';
        e.currentTarget.style.boxShadow = '0 16px 48px rgba(0, 0, 0, 0.4), 0 0 40px rgba(38, 208, 206, 0.25)';
        e.currentTarget.style.transform = 'translateY(-8px)';
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 45, 64, 0.98) 0%, rgba(25, 40, 55, 0.95) 100%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.3)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(38, 208, 206, 0.08)';
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(30, 45, 64, 0.95) 0%, rgba(25, 40, 55, 0.9) 100%)';
      }}
      >
        {/* Glow effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at center, rgba(38, 208, 206, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{
          marginBottom: '0.5rem',
          color: '#26d0ce',
          filter: 'drop-shadow(0 0 10px rgba(38, 208, 206, 0.3))',
          position: 'relative',
          zIndex: 1,
          transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}>
          <Icon />
        </div>
        <h3 style={{
          fontSize: '1.3rem',
          fontWeight: '900',
          color: '#ffffff',
          margin: '0.5rem 0 0.25rem',
          letterSpacing: '-0.01em',
          position: 'relative',
          zIndex: 1,
        }}>
          {titulo}
        </h3>
        <p style={{
          fontSize: '0.9rem',
          color: '#a0aab5',
          margin: 0,
          lineHeight: '1.5',
          position: 'relative',
          zIndex: 1,
          fontWeight: 500,
        }}>
          {descricao}
        </p>
      </div>
    </Link>
  );
}

export default function CategoriasPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Forçar Dark Mode na página de categorias
    localStorage.setItem('theme', 'dark');

    const root = document.documentElement;
    const darkTheme = {
      bg_primary: '#0d1117',
      bg_secondary: '#161b22',
      bg_tertiary: '#21262d',
      sidebar_bg: '#0d1117',
      text_primary: '#c9d1d9',
      text_secondary: '#e0e0e0',
      text_tertiary: '#8b949e',
      text_disabled: '#6e7681',
      border_light: '#30363d',
      border_default: '#444c56',
      border_dark: '#6e7681',
      accent: '#39c5cf',
      accent_hover: '#1f8f9c',
      success: '#1dd1a1',
      warning: '#f59e0b',
      error: '#ef4444',
      info: '#3b82f6',
    };

    Object.entries(darkTheme).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    document.body.style.backgroundColor = 'var(--color-bg-primary)';
    document.body.style.color = 'var(--color-text-primary)';
  }, []);

  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Carregando...</div>;
  }

  if (!session) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Acesso negado</div>;
  }

  const role = session.user.role;

  // Definir permissões por role
  const permissoes = {
    inventario_pecas: ['admin', 'supervisor', 'coordinator', 'analyst', 'field_technician'].includes(role),
    ferramental: ['admin', 'analista_custo'].includes(role),
    frotas: ['admin'].includes(role),
    cadastro: ['admin', 'supervisor', 'coordinator'].includes(role),
  };

  return (
    <div style={{
      padding: 0,
      width: '100%',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f1419 0%, #0a1628 50%, #0d1825 100%)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      flexDirection: 'column',
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
              linear-gradient(135deg, rgba(15, 20, 25, 0.8) 0%, rgba(10, 22, 40, 0.75) 50%, rgba(13, 24, 37, 0.8) 100%)
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
              radial-gradient(circle at 20% 20%, rgba(38, 208, 206, 0.2) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(38, 208, 206, 0.15) 0%, transparent 55%)
            `,
          }}
        />
      </div>

      {/* Header */}
      <div style={{
        padding: '1.5rem 2rem 0',
        textAlign: 'center',
        borderBottom: 'none',
        position: 'relative',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
      }}>
        {/* Logo */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.15) 0%, transparent 100%)',
          padding: '1.75rem 2.5rem',
          borderRadius: '16px',
          border: '1.5px solid rgba(38, 208, 206, 0.4)',
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
            src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Branco-2-(1).png"
            alt="Positivo Tecnologia"
            style={{
              maxWidth: '220px',
              height: 'auto',
              filter: 'brightness(1.15)',
            }}
          />
        </div>

        <h1 style={{
          fontSize: '3.2rem',
          fontWeight: '900',
          color: '#ffffff',
          margin: 0,
          letterSpacing: '-0.02em',
          textShadow: '0 2px 10px rgba(38, 208, 206, 0.3)',
        }}>
          Bem-vindo ao Portal Onsite
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#8b95a5',
          margin: 0,
          lineHeight: '1.4',
          fontWeight: 500,
          letterSpacing: '0.01em',
        }}>
          Selecione uma categoria para começar
        </p>
      </div>

      {/* Main content - Grid de categorias */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2.5rem 2rem 3rem',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '2rem',
          maxWidth: '1300px',
          width: '100%',
        }}>
        <CategoriaCard
          titulo="Inventário & Peças"
          descricao="Gerencie inventários, peças novas, peças usadas e agendamentos"
          icon={IconInventario}
          href="/dashboard"
          temAcesso={permissoes.inventario_pecas}
        />

        <CategoriaCard
          titulo="Ferramental"
          descricao="Solicitações, entregas, estoque técnico e central"
          icon={IconFerramental}
          href="/ferramental"
          temAcesso={permissoes.ferramental}
        />

        <CategoriaCard
          titulo="Frotas"
          descricao="Veículos, combustível, manutenções e movimentações"
          icon={IconFrotas}
          href="/frotas"
          temAcesso={permissoes.frotas}
        />

        <CategoriaCard
          titulo="Cadastro & Técnicos"
          descricao="Gerenciar técnicos, usuários e configurações"
          icon={IconCadastro}
          href="/cadastro-tecnicos"
          temAcesso={permissoes.cadastro}
        />
        </div>
      </div>

      {/* Footer com user info */}
      <div style={{
        padding: '1.25rem 2rem',
        borderTop: '1.5px solid rgba(38, 208, 206, 0.2)',
        background: 'linear-gradient(135deg, rgba(15, 20, 25, 0.95) 0%, rgba(20, 30, 40, 0.9) 100%)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.3) 0%, rgba(38, 208, 206, 0.1) 100%)',
            border: '1.5px solid rgba(38, 208, 206, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1rem',
            fontWeight: '800',
            color: '#26d0ce',
            boxShadow: '0 0 15px rgba(38, 208, 206, 0.2)',
          }}>
            {session.user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: '#ffffff',
              letterSpacing: '-0.01em',
            }}>
              {session.user.name}
            </div>
            <div style={{
              fontSize: '0.75rem',
              color: '#8b95a5',
              fontWeight: 500,
              marginTop: '0.15rem',
            }}>
              {session.user.email}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              background: 'transparent',
              border: '1.5px solid rgba(38, 208, 206, 0.4)',
              borderRadius: '8px',
              padding: '0.6rem 1.2rem',
              cursor: 'pointer',
              color: '#a0aab5',
              fontSize: '0.8rem',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.7)';
              e.currentTarget.style.color = '#26d0ce';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(38, 208, 206, 0.3)';
              e.currentTarget.style.background = 'rgba(38, 208, 206, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.4)';
              e.currentTarget.style.color = '#a0aab5';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
