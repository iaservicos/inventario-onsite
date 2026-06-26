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
      const res = await fetch('/api/frotas/movimentacao/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setMovimentacoes(dados.data || []);
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
    m.placa.toUpperCase().includes(filters.search.toUpperCase())
  );

  const stats = {
    total: filtrados.length,
    ultimas24h: filtrados.filter(m => {
      const data = new Date(m.data_movimentacao);
      const agora = new Date();
      const diff = (agora - data) / (1000 * 60 * 60);
      return diff <= 24;
    }).length
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Movimentações"
        subtitle="Histórico de trocas de técnico e alocação de veículos"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <StatCard label="Total de Movimentações" value={stats.total} />
        <StatCard label="Últimas 24h" value={stats.ultimas24h} />
      </div>

      {/* Filtro */}
      <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar por placa..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ width: '100%', maxWidth: '300px', padding: '0.5rem 0.75rem', border: '1px solid var(--color-border-light)', borderRadius: '4px', fontSize: '0.9rem' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: 'var(--color-bg-primary)', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--color-border-light)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhuma movimentação encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-tertiary)' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico Anterior</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Novo Técnico</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-bg-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motivo</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-bg-tertiary)', background: idx % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-tertiary)' }}>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                      {m.data_movimentacao ? new Date(m.data_movimentacao).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono'" }}>
                      {m.placa}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-tertiary)' }}>
                      {m.tecnico_anterior || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-secondary)', fontWeight: '600' }}>
                      {m.novo_tecnico || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--color-text-tertiary)' }}>
                      {m.motivo || '-'}
                    </td>
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

function StatCard({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)', borderRadius: '8px', padding: '1.5rem', borderTop: '3px solid var(--color-text-secondary)' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-bg-secondary)' }}>
        {value}
      </div>
    </div>
  );
}


