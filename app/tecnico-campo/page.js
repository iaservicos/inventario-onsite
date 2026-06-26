'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

export default function TecnicoCampoDashboard() {
  const { data: session } = useSession();

  const tecnico = session?.user;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', fontFamily: "'Inter'" }}>
      {/* Header Mobile */}
      <div style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)', padding: '1.5rem 2.5rem', borderBottom: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'var(--color-accent-cyan)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '800',
              color: '#000'
            }}
          >
            {tecnico?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{tecnico?.name || 'Técnico'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '600' }}>Campo</div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '2.5rem 3rem' }}>
        {/* Menu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          <Link href="/tecnico-campo/chamados" style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-cyan)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📋</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Chamados</div>
            </div>
          </Link>

          <Link href="/tecnico-campo/historico" style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '2rem 1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-cyan)';
                e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.2)';
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-light)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⏰</div>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Histórico</div>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '0.75rem', fontWeight: '800', letterSpacing: '0.05em' }}>
            Status
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ● Disponível
          </div>
        </div>
      </div>
    </div>
  );
}
