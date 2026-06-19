'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function MovimentacoesPage() {
  const [filters, setFilters] = useState({ search: '' });
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setMovimentacoes([]);
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

  const filtrados = movimentacoes.filter(m =>
    m.placa.toUpperCase().includes(filters.search.toUpperCase()) ||
    m.tecnicoAnterior.toUpperCase().includes(filters.search.toUpperCase()) ||
    m.tecnicoAtual.toUpperCase().includes(filters.search.toUpperCase())
  );

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Movimentações" subtitle="Registro de todas as trocas de técnico por veículo" />

      {/* Filtro */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', marginTop: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por placa ou técnico..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: '200px', padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eeeeee' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhuma movimentação encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico Anterior</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico Atual</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333' }}>{m.placa}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.modelo}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.tecnicoAnterior}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.tecnicoAtual}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(m.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.registradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
