'use client';

import { useEffect, useState } from 'react';

export default function DashboardLayout({ children, title, subtitle }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    setTheme(savedTheme);

    const handleStorageChange = () => {
      const newTheme = localStorage.getItem('theme') || 'dark';
      setTheme(newTheme);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const isDark = theme === 'dark';

  return (
    <div style={{
      padding: '2rem',
      width: '100%',
      background: isDark
        ? 'linear-gradient(135deg, #0f1419 0%, #0a1628 50%, #0d1825 100%)'
        : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 50%, #f0f1f3 100%)',
      minHeight: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background Brasil 3D - apenas em dark mode */}
      {isDark && (
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
                linear-gradient(135deg, rgba(15, 20, 25, 0.75) 0%, rgba(10, 22, 40, 0.7) 50%, rgba(13, 24, 37, 0.75) 100%)
              `,
              pointerEvents: 'none',
            }}
          />

          {/* Glow dinâmico subtil */}
          <div
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              background: `
                radial-gradient(circle at 20% 20%, rgba(38, 208, 206, 0.15) 0%, transparent 45%),
                radial-gradient(circle at 80% 80%, rgba(38, 208, 206, 0.1) 0%, transparent 50%)
              `,
            }}
          />
        </div>
      )}

      {/* Conteúdo */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {title && (
          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: '900',
              color: isDark ? '#ffffff' : '#0f1419',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              margin: '0 0 0.5rem 0',
            }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{
                fontSize: '0.8125rem',
                color: isDark ? '#8b95a5' : '#64748b',
                margin: 0,
              }}>
                {subtitle}
              </p>
            )}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
