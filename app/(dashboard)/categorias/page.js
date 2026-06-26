'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';

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
        border: '1px solid var(--color-border-default)',
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
        e.currentTarget.style.borderColor = 'var(--color-accent)';
        e.currentTarget.style.boxShadow = '0 0 20px rgba(16, 185, 129, 0.2)';
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--color-border-default)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
      >
        <div style={{ marginBottom: '1rem', color: 'var(--color-accent)' }}>
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
      padding: '3rem 2rem',
      width: '100%',
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      color: 'var(--color-text-primary)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-text-primary)', margin: '0 0 0.5rem' }}>
          Bem-vindo ao Portal
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--color-text-tertiary)', margin: 0 }}>
          Olá, <strong>{session.user.name}</strong>. Selecione uma categoria para começar.
        </p>
      </div>

      {/* Grid de categorias */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
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
  );
}
