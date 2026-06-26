'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ROLE_LABELS } from '@/lib/utils';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const INVENTARIO_ITEMS = [
  { href: '/dashboard', label: 'Dashboard Inventário' },
  { href: '/divergencias', label: 'Divergências' },
  { href: '/historico', label: 'Histórico' },
  { href: '/agendamentos', label: 'Agendamentos' },
  { href: '/pecas', label: 'Peças Novas' },
  { href: '/pecas-usadas', label: 'Peças Usadas' },
  { href: '/devolucoes', label: 'Lotes Montados' },
];

const ADMIN_ITEMS = [
  { href: '/usuarios', label: 'Usuários' },
  { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos' },
];

const SHARED_ADMIN_ITEMS = [
  { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos' },
];

const FERRAMENTAL_ITEMS = [
  { href: '/ferramental/dashboard', label: 'Dashboard' },
  { href: '/ferramental', label: 'Solicitações' },
  { href: '/ferramental/entrega', label: 'Registrar Entrega' },
  { href: '/ferramental/estoque', label: 'Estoque Técnico' },
  { href: '/ferramental/estoque-central', label: 'Estoque Central' },
  { href: '/ferramental/desligamentos', label: 'Devoluções' },
];

const FROTAS_ITEMS = [
  { href: '/frotas', label: 'Dashboard' },
  { href: '/frotas/veiculos', label: 'Frota' },
  { href: '/frotas/manutencao', label: 'Manutenções' },
  { href: '/frotas/movimentacoes', label: 'Movimentações' },
  { href: '/frotas/combustivel', label: 'Combustível Serviço' },
  { href: '/frotas/combustivel-motoristas', label: 'Motoristas Consumo' },
  { href: '/frotas/combustivel-historico', label: 'Histórico Abast.' },
  { href: '/frotas/fotos', label: 'Validar Fotos' },
  { href: '/frotas/devolucoes', label: 'Devoluções' },
  { href: '/frotas/financeiro', label: 'Financeiro' },
];

function getActiveCategory(pathname) {
  if (pathname.startsWith('/ferramental')) return 'ferramental';
  if (pathname.startsWith('/frotas')) return 'frotas';
  if (pathname.startsWith('/cadastro-tecnicos') || pathname.startsWith('/usuarios')) return 'admin';
  if (pathname.startsWith('/pecas') || pathname.startsWith('/devolucoes')) return 'inventario';
  if (pathname.startsWith('/dashboard') || pathname === '/' || pathname.startsWith('/divergencias') || pathname.startsWith('/historico') || pathname.startsWith('/agendamentos')) return 'inventario';
  return null;
}

function getCategoryMenu(category, role) {
  const isAdmin = role === 'admin';
  const isAnalistaCusto = role === 'analista_custo';
  const hasFerramental = ['admin', 'analista_custo'].includes(role);
  const hasFrotas = role === 'admin';

  switch (category) {
    case 'inventario':
      return INVENTARIO_ITEMS;
    case 'admin':
      return isAnalistaCusto ? SHARED_ADMIN_ITEMS : (isAdmin ? ADMIN_ITEMS : SHARED_ADMIN_ITEMS);
    case 'ferramental':
      return hasFerramental ? FERRAMENTAL_ITEMS : [];
    case 'frotas':
      return hasFrotas ? FROTAS_ITEMS : [];
    default:
      return [];
  }
}

function getCategoryName(category) {
  const names = {
    inventario: 'Inventário & Peças',
    estoque: 'Estoque',
    admin: 'Cadastro & Técnicos',
    ferramental: 'Ferramental',
    frotas: 'Frotas',
  };
  return names[category] || '';
}

export default function Sidebar({ user, isOpen }) {
  const pathname = usePathname();
  const activeCategory = getActiveCategory(pathname);
  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const isManagement = ['admin', 'supervisor', 'coordinator', 'analyst'].includes(user?.role);
  const isAnalistaCusto = user?.role === 'analista_custo';
  const isAdmin = user?.role === 'admin';
  const hasFerramental = ['admin', 'analista_custo'].includes(user?.role);
  const hasFrotas = user?.role === 'admin';

  const categoryMenu = getCategoryMenu(activeCategory, user?.role);
  const categoryName = getCategoryName(activeCategory);

  const bottomButtonStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.55rem 0.75rem', borderRadius: '8px', border: '1.5px solid var(--color-border-light)',
    background: 'transparent', color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: '700',
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', width: '100%',
    transition: 'all 0.25s ease',
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1rem 1rem', borderBottom: '1.5px solid var(--color-border-light)' }}>
        <Link href="/categorias" style={{ display: 'flex', justifyContent: 'center', textDecoration: 'none' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(38, 208, 206, 0.12) 0%, transparent 100%)',
            padding: '1rem',
            borderRadius: '12px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: '1px solid rgba(38, 208, 206, 0.3)',
            boxShadow: '0 0 20px rgba(38, 208, 206, 0.15)',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            width: '100%',
            minHeight: '60px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.6)';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(38, 208, 206, 0.25)';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.18) 0%, transparent 100%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(38, 208, 206, 0.3)';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(38, 208, 206, 0.15)';
            e.currentTarget.style.background = 'linear-gradient(135deg, rgba(38, 208, 206, 0.12) 0%, transparent 100%)';
          }}>
            <img
              src="https://raw.githubusercontent.com/iaservicos/IMAGENS/refs/heads/main/Logo_Positivo_Tecnologia_Prote%C3%A7%C3%A3o_Branco-2-(1).png"
              alt="Positivo Tecnologia"
              style={{
                maxWidth: '170px',
                height: 'auto',
                maxHeight: '45px',
                objectFit: 'contain',
                filter: 'brightness(1.1)',
              }}
            />
          </div>
        </Link>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', letterSpacing: '0.05em', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
            {categoryName || 'PORTAL ONSITE'}
          </div>
          {!activeCategory && (
            <div style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: '600', marginTop: '0.2rem' }}>IA SERVIÇOS</div>
          )}
        </div>
      </div>

      {/* Menu da Categoria */}
      <nav style={{ flex: 1, padding: '0.75rem', overflowY: 'auto' }}>
        {categoryMenu.length > 0 ? (
          categoryMenu.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0.65rem 0.75rem',
                  borderRadius: '8px',
                  marginBottom: '0.35rem',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: active ? '700' : '500',
                  color: active ? 'white' : 'var(--color-text-tertiary)',
                  background: active ? 'linear-gradient(135deg, rgba(29, 209, 161, 0.2) 0%, transparent 100%)' : 'transparent',
                  border: active ? '1px solid var(--color-accent)' : '1px solid transparent',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(29, 209, 161, 0.1)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  }
                }}>
                {item.label}
              </Link>
            );
          })
        ) : (
          <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.75rem' }}>
            Selecione uma categoria
          </div>
        )}
      </nav>

      {/* Rodapé do usuário */}
      <div style={{ padding: '0.75rem', borderTop: '1.5px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem', padding: '0.35rem 0.25rem' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--color-bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-text-primary)', flexShrink: 0 }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '0.6rem', color: 'var(--color-text-tertiary)' }}>{ROLE_LABELS?.[user?.role] || user?.role}</div>
          </div>
          {isAdmin && (
            <Link href="/admin/logs" title="Logs de acesso"
              style={{ flexShrink: 0, width: '26px', height: '26px', borderRadius: '5px', border: '1px solid var(--color-border-default)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive('/admin/logs') ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', background: isActive('/admin/logs') ? 'var(--color-bg-tertiary)' : 'transparent' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </Link>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <ThemeToggle />
          <Link href="/perfil" style={{ ...bottomButtonStyle, flex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-dark)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>
            Senha
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ ...bottomButtonStyle, flex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-dark)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
