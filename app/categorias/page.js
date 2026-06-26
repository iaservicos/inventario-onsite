'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

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
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
        borderRadius: '12px',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        cursor: 'not-allowed',
        opacity: 0.5,
      }}>
        <div style={{ marginBottom: '1rem', color: 'var(--color-text-disabled)' }}>
          <Icon />
        </div>
        <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-text-secondary)', margin: '0 0 0.5rem' }}>
          {titulo}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Acesso não autorizado
        </p>
      </div>
    );
  }

  return (
    <Link href={href}>
      <div style={{
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border-light)',
        borderRadius: '12px',
        padding: '2rem 1.5rem',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-accent-cyan)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-light)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{ marginBottom: '1rem', color: 'var(--color-accent-cyan)' }}>
          <Icon />
        </div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--color-text-primary)', margin: '0 0 0.5rem' }}>
          {titulo}
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', margin: 0, lineHeight: '1.4' }}>
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
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        padding: '2.5rem 3rem',
        textAlign: 'center',
        borderBottom: '1px solid var(--color-border-light)',
      }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '900', color: 'var(--color-text-primary)', margin: '0 0 0.75rem' }}>
          Bem-vindo ao Portal
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', margin: 0, lineHeight: '1.5' }}>
          Selecione uma categoria para começar
        </p>
      </div>

      {/* Main content - Grid de categorias */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 2rem',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1200px',
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
        padding: '1.5rem 3rem',
        borderTop: '1px solid var(--color-border-light)',
        background: 'var(--color-bg-secondary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'var(--color-accent-cyan)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            fontWeight: '800',
            color: '#000',
          }}>
            {session.user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>
              {session.user.name}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              color: 'var(--color-text-tertiary)',
              fontSize: '0.8rem',
              fontWeight: '700',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent-cyan)';
              e.currentTarget.style.color = 'var(--color-accent-cyan)';
              e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-light)';
              e.currentTarget.style.color = 'var(--color-text-tertiary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
