'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ROLE_LABELS } from '@/lib/utils';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard Inventário', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>) },
  { href: '/divergencias', label: 'Divergências', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>) },
  { href: '/historico', label: 'Histórico', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>) },
  { href: '/agendamentos', label: 'Agendamentos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>) },
];

const ESTOQUE_ITEMS = [
  { href: '/pecas', label: 'Peças Novas', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>) },
  { href: '/pecas-usadas', label: 'Peças Usadas', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>) },
  { href: '/devolucoes', label: 'Lotes Montados', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-3" /></svg>) },
];

const ADMIN_ITEMS = [
  { href: '/usuarios', label: 'Usuários', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
  { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>) },
];

const SHARED_ADMIN_ITEMS = [
  { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>) },
];

const FERRAMENTAL_ITEMS = [
  { href: '/ferramental/dashboard', label: 'Dashboard', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>) },
  { href: '/ferramental', label: 'Solicitações', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>) },
  { href: '/ferramental/entrega', label: 'Registrar Entrega', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>) },
  { href: '/ferramental/estoque', label: 'Estoque Técnico', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>) },
  { href: '/ferramental/estoque-central', label: 'Estoque Central', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>) },
  { href: '/ferramental/desligamentos', label: 'Devoluções', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" y1="8" x2="23" y2="14" /><line x1="23" y1="8" x2="17" y2="14" /></svg>) },
];

const FROTAS_ITEMS = [
  { href: '/frotas', label: 'Dashboard', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>) },
  { href: '/frotas/veiculos', label: 'Frota', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>) },
  { href: '/frotas/manutencao', label: 'Manutenções', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="10"/></svg>) },
  { href: '/frotas/movimentacoes', label: 'Movimentações', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>) },
  { href: '/frotas/combustivel', label: 'Combustível Serviço', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="12 2 15 11 23 11 18 16 20 26 12 21 4 26 6 16 1 11 9 11"/></svg>) },
  { href: '/frotas/combustivel-motoristas', label: 'Motoristas Consumo', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>) },
  { href: '/frotas/combustivel-historico', label: 'Histórico Abast.', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>) },
  { href: '/frotas/fotos', label: 'Validar Fotos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>) },
  { href: '/frotas/devolucoes', label: 'Devoluções', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v12z"/><polyline points="15 6 9 12 15 18"/></svg>) },
  { href: '/frotas/financeiro', label: 'Financeiro', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>) },
];

const TECNICO_ITEMS = [
  { href: '/tecnico-campo', label: 'Técnico de Campo', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
];

function Chevron({ open }) {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', flexShrink: 0 }}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function NavSection({ label, items, isActive, open, onToggle }) {
  return (
    <div style={{ marginBottom: '0.25rem' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.35rem 0.75rem', background: 'none', border: 'none', cursor: 'pointer', borderRadius: '6px' }}
      >
        <span style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555' }}>{label}</span>
        <Chevron open={open} />
      </button>

      {open && (
        <div style={{ marginTop: '0.1rem' }}>
          {items.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.45rem 0.75rem', borderRadius: '6px', marginBottom: '1px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: active ? '700' : '500', color: active ? '#fff' : '#ccc', background: active ? '#333' : 'transparent', transition: 'all 0.1s' }}>
                <span style={{ color: active ? '#fff' : '#aaa', flexShrink: 0 }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ user, isOpen }) {
  const pathname = usePathname();
  const isActive = (href) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  const isManagement    = ['admin', 'supervisor', 'coordinator', 'analyst'].includes(user?.role);
  const isAnalistaCusto = user?.role === 'analista_custo';
  const isAdmin         = user?.role === 'admin';
  const hasFerramental  = ['admin', 'analista_custo'].includes(user?.role);

  const hasFrotas = user?.role === 'admin';

  const [open, setOpen] = useState({ inventario: true, estoque: true, gestao: true, ferramental: true, frotas: true });
  const toggle = (key) => setOpen(p => ({ ...p, [key]: !p[key] }));

  const bottomButtonStyle = {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
    padding: '0.45rem', borderRadius: '6px', border: '1px solid var(--color-border-default)',
    background: 'transparent', color: 'var(--color-text-tertiary)', fontSize: '0.7rem', fontWeight: '700',
    cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none', width: '100%',
  };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '1.5rem 1rem 1rem', borderBottom: '1px solid var(--color-border-default)' }}>
        <div style={{ background: 'var(--color-bg-primary)', padding: '0.5rem', borderRadius: '6px', display: 'flex', justifyContent: 'center' }}>
          <Image src="/logo-positivo.png" alt="Positivo Tecnologia" width={200} height={50} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ marginTop: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '900', letterSpacing: '0.05em', color: 'var(--color-text-primary)' }}>PORTAL ONSITE</div>
          <div style={{ fontSize: '0.58rem', color: 'var(--color-text-tertiary)', fontWeight: '600', marginTop: '0.2rem' }}>IA SERVIÇOS</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0.75rem 0.75rem', overflowY: 'auto' }}>
        {!isAnalistaCusto && (
          <NavSection label="Inventário" items={NAV_ITEMS} isActive={isActive} open={open.inventario} onToggle={() => toggle('inventario')} />
        )}

        {!isAnalistaCusto && (
          <NavSection label="Estoque" items={ESTOQUE_ITEMS} isActive={isActive} open={open.estoque} onToggle={() => toggle('estoque')} />
        )}

        {(isManagement && !isAnalistaCusto) && (
          <NavSection
            label="Gestão"
            items={isAdmin ? ADMIN_ITEMS : SHARED_ADMIN_ITEMS}
            isActive={isActive}
            open={open.gestao}
            onToggle={() => toggle('gestao')}
          />
        )}

        {isAnalistaCusto && (
          <NavSection label="Técnicos" items={SHARED_ADMIN_ITEMS} isActive={isActive} open={open.gestao} onToggle={() => toggle('gestao')} />
        )}

        {hasFerramental && (
          <NavSection label="Ferramental" items={FERRAMENTAL_ITEMS} isActive={isActive} open={open.ferramental} onToggle={() => toggle('ferramental')} />
        )}

        {hasFrotas && (
          <NavSection label="Frotas" items={FROTAS_ITEMS} isActive={isActive} open={open.frotas} onToggle={() => toggle('frotas')} />
        )}
      </nav>

      {/* Rodapé do usuário */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border-default)', background: 'var(--color-bg-secondary)' }}>
        {/* Info do usuário + botão logs */}
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
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
            Senha
          </Link>
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            style={{ ...bottomButtonStyle, flex: 1 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-border-dark)'; e.currentTarget.style.color = 'var(--color-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border-default)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </div>
    </aside>
  );
}
