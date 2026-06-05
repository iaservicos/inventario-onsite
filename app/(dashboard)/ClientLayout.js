'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';

export default function ClientLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Fecha o sidebar ao navegar (mobile)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

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
        style={{ flex: 1, marginLeft: '240px', minHeight: '100vh', overflow: 'auto', background: '#fff', width: 'calc(100% - 240px)' }}
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
