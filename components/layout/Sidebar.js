'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ROLE_LABELS } from '@/lib/utils';
import Image from 'next/image';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard Inventário', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>) },
  { href: '/tecnicos', label: 'Técnicos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>) },
  { href: '/alertas', label: 'Alertas', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>) },
  { href: '/divergencias', label: 'Divergência Inventário', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>) },
  { href: '/historico', label: 'Histórico Inventário', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>) },
  { href: '/agendamentos', label: 'Agendamento Inventário', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>) },
  { href: '/pecas', label: 'Peças Novas', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>) },
  { href: '/logs', label: 'Logs', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>) },
];

const ADMIN_ITEMS = [
  { href: '/usuarios', label: 'Usuários', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>) },
];

const SHARED_ADMIN_ITEMS = [
  { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>) },
];

const FERRAMENTAL_ITEMS = [
  { href: '/ferramental', label: 'Solicitações', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>) },
  { href: '/ferramental/estoque', label: 'Estoque por Técnico', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>) },
  { href: '/ferramental/estoque-central', label: 'Estoque Central', icon: (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /><path d="M12 3v4" /></svg>) },
];

export default function Sidebar({ user, isOpen }) {
  const pathname = usePathname();
  function isActive(href) { return pathname === href || (href !== '/dashboard' && pathname.startsWith(href)); }
  const isManagement = user?.role === 'admin' || user?.role === 'supervisor' || user?.role === 'coordinator' || user?.role === 'analyst';
  const isAnalistaCusto = user?.role === 'analista_custo';
  const hasFerramental = ['admin', 'supervisor', 'analista_custo'].includes(user?.role);

  // Estilo comum para os botões da parte inferior
  const bottomButtonStyle = {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #333333',
    background: 'transparent',
    color: '#888888',
    fontSize: '0.7rem',
    fontWeight: '700',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s ease',
    textDecoration: 'none'
  };

  const handleMouseEnter = e => { e.currentTarget.style.borderColor = '#555555'; e.currentTarget.style.color = '#ffffff'; };
  const handleMouseLeave = e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#888888'; };

  return (
    <aside className={`sidebar${isOpen ? ' sidebar-open' : ''}`}>
      <div style={{ padding: '2rem 1rem', borderBottom: '1px solid #333333' }}>
        <div style={{ background: '#ffffff', padding: '0.5rem', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}>
          <Image src="/logo-positivo.png" alt="Positivo Tecnologia" width={220} height={55} style={{ objectFit: 'contain' }} />
        </div>
        <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '900', letterSpacing: '0.05em', color: '#ffffff' }}>PORTAL ONSITE</div>
          <div style={{ fontSize: '0.6rem', color: '#888888', fontWeight: '600', marginTop: '0.25rem' }}>IA SERVIÇOS</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '1rem 0.75rem' }}>

        {/* Inventário — oculto para analista_custo */}
        {!isAnalistaCusto && (
          <div>
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '2px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: active ? '700' : '500', color: active ? '#ffffff' : '#888888', background: active ? '#333333' : 'transparent', transition: 'all 0.15s ease' }}>
                  <span style={{ color: active ? '#ffffff' : '#666666', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Gestão — oculto para analista_custo */}
        {isManagement && !isAnalistaCusto && (
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555555', padding: '0 0.75rem', marginBottom: '0.5rem' }}>Gestão</div>
            {SHARED_ADMIN_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (<Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '2px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: active ? '700' : '500', color: active ? '#ffffff' : '#888888', background: active ? '#333333' : 'transparent' }}><span>{item.icon}</span><span>{item.label}</span></Link>);
            })}
            {user?.role === 'admin' && ADMIN_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (<Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '2px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: active ? '700' : '500', color: active ? '#ffffff' : '#888888', background: active ? '#333333' : 'transparent' }}><span>{item.icon}</span><span>{item.label}</span></Link>);
            })}
          </div>
        )}

        {/* Ferramental — visível para admin, supervisor e analista_custo */}
        {hasFerramental && (
          <div style={{ marginTop: isAnalistaCusto ? '0' : '1.5rem' }}>
            <div style={{ fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#555555', padding: '0 0.75rem', marginBottom: '0.5rem' }}>Ferramental</div>
            {FERRAMENTAL_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link key={item.href} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '2px', textDecoration: 'none', fontSize: '0.75rem', fontWeight: active ? '700' : '500', color: active ? '#ffffff' : '#888888', background: active ? '#333333' : 'transparent', transition: 'all 0.15s ease' }}>
                  <span style={{ color: active ? '#ffffff' : '#666666', flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      <div style={{ padding: '1rem', borderTop: '1px solid #333333', background: '#141414' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', padding: '0.5rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '700', color: '#ffffff' }}>
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
            <div style={{ fontSize: '0.65rem', color: '#888888' }}>{ROLE_LABELS?.[user?.role] || user?.role}</div>
          </div>
        </div>

        <Link 
          href="/perfil"
          style={bottomButtonStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Alterar Senha
        </Link>
        
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          style={{ ...bottomButtonStyle, marginTop: '0.5rem' }}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
}