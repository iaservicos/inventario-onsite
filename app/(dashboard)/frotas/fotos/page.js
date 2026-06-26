'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function FotosPage() {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ placa: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/fotos-hodometro/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setFotos(dados.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrados = fotos.filter(f =>
    f.placa.toUpperCase().includes(filters.placa.toUpperCase())
  );

  const stats = {
    pendentes: filtrados.filter(f => f.status === 'pendente').length,
    aprovadas: filtrados.filter(f => f.status === 'aprovado').length,
    rejeitadas: filtrados.filter(f => f.status === 'rejeitado').length
  };

  const fotosPendentes = filtrados.filter(f => f.status === 'pendente');

  return (
    <DashboardLayout
      title="Validação de Fotos do Hodômetro"
      subtitle="Aprovando, a foto é apagada do banco. Rejeitando, o gestor é notificado."
    >

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem', marginTop: '3rem' }}>
        <StatCard label="Pendentes" value={stats.pendentes} />
        <StatCard label="Aprovadas" value={stats.aprovadas} />
        <StatCard label="Rejeitadas" value={stats.rejeitadas} />
      </div>

      {/* Filtro */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Filtrar por placa..."
          value={filters.placa}
          onChange={(e) => setFilters({ ...filters, placa: e.target.value })}
          style={{ width: '100%', maxWidth: '300px', padding: '0.5rem 1rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
        />
      </div>

      {/* Grid de Fotos */}
      <div style={{ marginTop: '2rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando...</div>
        ) : fotosPendentes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: 'var(--color-text-tertiary)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.3 }}>✓</div>
            <div>Nenhuma foto pendente de validação.</div>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '1.5rem'
          }}>
            {fotosPendentes.map((foto) => (
              <div
                key={foto.id}
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  transform: 'translateY(0)'
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Imagem */}
                <div style={{
                  height: '200px',
                  background: 'var(--color-bg-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid var(--color-border-light)',
                  color: 'var(--color-text-tertiary)',
                  fontSize: '0.9rem'
                }}>
                  Foto Hodômetro
                </div>

                {/* Info */}
                <div style={{ padding: '1.5rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Placa
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-accent-cyan)', marginBottom: '0.75rem' }}>
                      {foto.placa}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Motorista
                    </div>
                    <div style={{ color: 'var(--color-text-tertiary)', marginBottom: '0.75rem' }}>
                      {foto.motorista}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Data
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                          {new Date(foto.data).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Hodômetro
                        </div>
                        <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem', fontFamily: "'JetBrains Mono'" }}>
                          {foto.hodometro} km
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botões */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => handleAprovar(foto.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'var(--color-accent-cyan)',
                        color: 'var(--color-bg-primary)',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => (e.target.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)')}
                      onMouseOut={(e) => (e.target.style.boxShadow = 'none')}
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleRejeitar(foto.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: 'var(--color-bg-primary)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-light)',
                        borderRadius: '8px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                      }}
                      onMouseOver={(e) => (e.target.style.background = 'var(--color-bg-tertiary)')}
                      onMouseOut={(e) => (e.target.style.background = 'var(--color-bg-primary)')}
                    >
                      Rejeitar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </DashboardLayout>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', borderTop: '3px solid var(--color-accent-cyan)', cursor: 'pointer', transition: 'all 0.3s', transform: 'translateY(0)' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
        {value}
      </div>
    </div>
  );
}


