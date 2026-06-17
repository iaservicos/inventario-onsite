'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Sidebar from '@/components/layout/Sidebar';

const INACTIVITY_MS = 60 * 60 * 1000; // 1 hora

export default function ClientLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const lastLogged   = useRef('');
  const inactivityTimer = useRef(null);

  // Fecha o sidebar ao navegar (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  // Logout por inatividade após 1 hora sem interação
  useEffect(() => {
    const reset = () => {
      clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        signOut({ callbackUrl: '/login' });
      }, INACTIVITY_MS);
    };
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      clearTimeout(inactivityTimer.current);
      events.forEach(e => window.removeEventListener(e, reset));
    };
  }, []);

  // Log de página visitada (debounce: só loga se mudou de rota)
  useEffect(() => {
    if (!pathname || pathname === lastLogged.current) return;
    lastLogged.current = pathname;
    fetch('/api/log-access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'page_view', page_path: pathname }),
    }).catch(() => {});
  }, [pathname]);

  // Bloqueia scroll do body quando sidebar aberto no mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#fff' }}>
      {/* Sidebar */}
      <Sidebar user={user} isOpen={sidebarOpen} />

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Conteúdo principal */}
      <main
        className="main-content"
        style={{ minHeight: '100vh', overflow: 'auto', background: '#fff' }}
      >
        {/* Top bar mobile */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.03em' }}>PORTAL ONSITE</span>
        </div>

        {children}
      </main>
    </div>
  );
}
