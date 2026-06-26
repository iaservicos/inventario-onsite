'use client';

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function CombustiveisPage() {
  const [stats, setStats] = useState({
    total: 0,
    totalGasto: 0,
    consumoMedio: 0,
    distanciaMedia: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/frotas/combustivel/stats');
        const data = await response.json();
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error || 'Erro ao carregar dados');
        }
      } catch (err) {
        setError('Erro ao conectar com servidor: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <DashboardLayout
      title="Combustíveis"
      subtitle="Resumo de consumo importado"
    >

      <div style={{ maxWidth: '1200px', marginTop: '3rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
            Carregando dados...
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '12px',
              padding: '1.5rem',
              color: 'var(--color-text-tertiary)',
              marginBottom: '2rem'
            }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.5rem'
            }}>
            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                borderTop: '3px solid var(--color-accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: 'translateY(0)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                TOTAL DE REGISTROS
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
                {stats.total}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                borderTop: '3px solid var(--color-accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: 'translateY(0)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                TOTAL GASTO
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
                R$ {stats.totalGasto.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                borderTop: '3px solid var(--color-accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: 'translateY(0)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                CONSUMO MÉDIO
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
                {stats.consumoMedio.toFixed(2)} L
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '12px',
                padding: '1.5rem',
                borderTop: '3px solid var(--color-accent-cyan)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: 'translateY(0)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                DISTÂNCIA MÉDIA
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
                {stats.distanciaMedia.toFixed(0)} km
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

