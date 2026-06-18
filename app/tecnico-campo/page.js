'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';

const COLORS = {
  bg: '#f0f4f8',
  surface: '#fff',
  accent: '#0369a1',
  success: '#059669',
  text: '#0f172a',
  text3: '#94a3b8'
};

export default function TecnicoCampoDashboard() {
  const { data: session } = useSession();

  const tecnico = session?.user;

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: "'Inter'" }}>
      {/* Header Mobile */}
      <div style={{ background: COLORS.text, color: '#fff', padding: '1rem', paddingTop: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${COLORS.accent}, #0284c7)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem',
              fontWeight: '700'
            }}
          >
            {tecnico?.name?.charAt(0)?.toUpperCase() || 'T'}
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '700' }}>{tecnico?.name || 'Técnico'}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Campo</div>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ maxWidth: '500px', margin: '0 auto', padding: '1.2rem 1rem 2rem' }}>
        {/* Menu */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <Link href="/tecnico-campo/chamados" style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid #e5e7eb`,
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: COLORS.text }}>Chamados</div>
            </div>
          </Link>

          <Link href="/tecnico-campo/historico" style={{ textDecoration: 'none' }}>
            <div
              style={{
                background: COLORS.surface,
                border: `1px solid #e5e7eb`,
                borderRadius: '10px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer'
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏰</div>
              <div style={{ fontSize: '0.9rem', fontWeight: '700', color: COLORS.text }}>Histórico</div>
            </div>
          </Link>
        </div>

        {/* Info Card */}
        <div style={{ background: COLORS.surface, border: `1px solid #e5e7eb`, borderRadius: '10px', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.8rem', color: COLORS.text3, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Status
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: '700', color: COLORS.success }}>
            ● Disponível
          </div>
        </div>
      </div>
    </div>
  );
}
