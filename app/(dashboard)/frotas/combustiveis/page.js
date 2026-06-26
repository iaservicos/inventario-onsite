'use client';

import { useEffect, useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

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
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="CombustÃ­veis"
        subtitle="Resumo de consumo importado"
      />

      <div style={{ maxWidth: '1200px', marginTop: '2rem' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-tertiary)' }}>
            Carregando dados...
          </div>
        )}

        {error && (
          <div
            style={{
              background: 'var(--color-error)',
              border: '1px solid var(--color-error)',
              borderRadius: '6px',
              padding: '1rem',
              color: 'var(--color-error)',
              marginBottom: '1.5rem'
            }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                padding: '1.5rem'
              }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                TOTAL DE REGISTROS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-bg-secondary)' }}>
                {stats.total}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                padding: '1.5rem'
              }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                TOTAL GASTO
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-bg-secondary)' }}>
                R$ {stats.totalGasto.toFixed(2)}
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                padding: '1.5rem'
              }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                CONSUMO MÃ‰DIO
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-bg-secondary)' }}>
                {stats.consumoMedio.toFixed(2)} L
              </div>
            </div>

            <div
              style={{
                background: 'var(--color-bg-primary)',
                border: '1px solid var(--color-border-light)',
                borderRadius: '6px',
                padding: '1.5rem'
              }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginBottom: '0.5rem' }}>
                DISTÃ‚NCIA MÃ‰DIA
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-bg-secondary)' }}>
                {stats.distanciaMedia.toFixed(0)} km
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

