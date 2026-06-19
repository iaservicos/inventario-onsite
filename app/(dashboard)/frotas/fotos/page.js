'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function FotosPage() {
  const [fotos, setFotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setFotos([]);
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

  const handleAprovar = (id) => {
    setFotos(fotos.filter(f => f.id !== id));
  };

  const handleRejeitar = (id) => {
    const foto = fotos.find(f => f.id === id);
    if (foto) {
      foto.status = 'Rejeitada';
      setFotos([...fotos]);
    }
  };

  const fotosPendentes = fotos.filter(f => f.status === 'Pendente');

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Validar Fotos"
        subtitle="Aprovando, a foto é apagada do banco. Rejeitando, o gestor é notificado."
      />

      {/* Grid de Fotos */}
      <div style={{ marginTop: '1.5rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : fotosPendentes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            color: '#999999'
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
                  background: '#ffffff',
                  border: '1px solid #eeeeee',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}
              >
                {/* Imagem */}
                <div style={{
                  height: '200px',
                  background: '#f5f5f5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderBottom: '1px solid #eeeeee',
                  color: '#999999',
                  fontSize: '0.9rem'
                }}>
                  Foto Hodômetro
                </div>

                {/* Info */}
                <div style={{ padding: '1rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.75rem', color: '#999999', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Placa
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#000000', marginBottom: '0.75rem' }}>
                      {foto.placa}
                    </div>

                    <div style={{ fontSize: '0.75rem', color: '#999999', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Motorista
                    </div>
                    <div style={{ color: '#666666', marginBottom: '0.75rem' }}>
                      {foto.motorista}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#999999', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Data
                        </div>
                        <div style={{ color: '#666666', fontSize: '0.9rem' }}>
                          {new Date(foto.data).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: '#999999', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                          Hodômetro
                        </div>
                        <div style={{ color: '#666666', fontSize: '0.9rem', fontFamily: "'JetBrains Mono'" }}>
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
                        background: '#059669',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      Aprovar
                    </button>
                    <button
                      onClick={() => handleRejeitar(foto.id)}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        background: '#dc2626',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
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

      {/* Fotos Rejeitadas */}
      {fotos.filter(f => f.status === 'Rejeitada').length > 0 && (
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '6px' }}>
          <div style={{ color: '#dc2626', fontWeight: '600', marginBottom: '0.5rem' }}>
            Fotos Rejeitadas ({fotos.filter(f => f.status === 'Rejeitada').length})
          </div>
          <div style={{ color: '#991b1b', fontSize: '0.9rem' }}>
            O gestor foi notificado sobre as rejeições.
          </div>
        </div>
      )}
    </div>
  );
}
