'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function DevolucoesPage() {
  const [filters, setFilters] = useState({ search: '' });
  const [devolucoes, setDevolucoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDevolucao, setSelectedDevolucao] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setDevolucoes([]);
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

  const filtrados = devolucoes.filter(d =>
    d.placa.toUpperCase().includes(filters.search.toUpperCase())
  );

  const handleViewFotos = (devolucao) => {
    setSelectedDevolucao(devolucao);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedDevolucao(null);
  };

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%' }}>
      <PageHeader title="Devoluções" subtitle="Registro fotográfico ao devolver o veículo" />

      {/* Filtro */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', marginTop: '3rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filtrar por placa..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem 1rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border-light)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhuma devolução encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hodômetro</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivo</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fotos</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                      {new Date(d.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)' }}>{d.placa}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)' }}>{d.tecnico}</td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'" }}>
                      {d.hodometro}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)' }}>{d.motivo}</td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <button
                        onClick={() => handleViewFotos(d)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--color-accent-cyan)',
                          color: 'var(--color-bg-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.3s'
                        }}
                        onMouseOver={(e) => (e.target.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)')}
                        onMouseOut={(e) => (e.target.style.boxShadow = 'none')}
                      >
                        Ver ({d.fotos})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Fotos */}
      {showModal && selectedDevolucao && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={handleCloseModal}>
          <div
            style={{
              background: 'var(--color-bg-secondary)',
              borderRadius: '12px',
              width: 'min(700px, 96vw)',
              maxHeight: '90vh',
              overflowY: 'auto',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div style={{
              padding: '2rem',
              borderBottom: '1px solid var(--color-border-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              background: 'var(--color-bg-secondary)'
            }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--color-accent-cyan)' }}>
                Fotos da Devolução - {selectedDevolucao.placa}
              </div>
              <button
                onClick={handleCloseModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: 'var(--color-text-tertiary)'
                }}
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div style={{ padding: '2rem' }}>
              {/* Grid de Fotos */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                {selectedDevolucao.fotoUrls.map((foto, idx) => (
                  <div key={idx} style={{
                    background: 'var(--color-bg-primary)',
                    borderRadius: '12px',
                    height: '180px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--color-border-light)',
                    color: 'var(--color-text-tertiary)',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    transform: 'translateY(0)'
                  }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
                    Foto: {foto}
                  </div>
                ))}
              </div>

              {/* Observações */}
              <div style={{
                padding: '1.5rem',
                background: 'var(--color-bg-primary)',
                borderRadius: '12px',
                marginBottom: '2rem',
                border: '1px solid var(--color-border-light)'
              }}>
                <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Observações
                </div>
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                  {selectedDevolucao.observacoes}
                </div>
              </div>

              {/* Info Técnico */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.5rem',
                paddingTop: '2rem',
                borderTop: '1px solid var(--color-border-light)'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Técnico
                  </div>
                  <div style={{ color: 'var(--color-accent-cyan)', fontWeight: '600' }}>
                    {selectedDevolucao.tecnico}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                    Hodômetro
                  </div>
                  <div style={{ color: 'var(--color-accent-cyan)', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                    {selectedDevolucao.hodometro} km
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


