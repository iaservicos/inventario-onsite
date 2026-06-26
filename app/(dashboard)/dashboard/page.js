'use client';

import { useSession } from 'next-auth/react';
import AccessDenied from '@/components/ui/AccessDenied';
import PageHeader from '@/components/ui/PageHeader';

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700', color: 'var(--color-text-primary)' }}>Carregando...</div>;
  }

  // Verificar se tem acesso ao Dashboard de Inventário
  const hasAccess = ['admin', 'supervisor', 'coordinator', 'analyst', 'field_technician'].includes(session?.user?.role);

  if (!hasAccess) {
    return <AccessDenied modulo="Dashboard de Inventário" />;
  }

  return (
    <div style={{
      padding: '2rem',
      width: '100%',
    }}>
      <PageHeader
        title="Dashboard de Inventário"
        subtitle="Visão geral do inventário cíclico de técnicos"
      />

      <div style={{
        marginTop: '2rem',
        padding: '2rem',
        background: 'var(--color-bg-secondary)',
        border: '1.5px solid var(--color-border-light)',
        borderRadius: '12px',
        textAlign: 'center',
        color: 'var(--color-text-tertiary)',
      }}>
        <p>Dashboard em construção...</p>
      </div>
    </div>
  );
}
