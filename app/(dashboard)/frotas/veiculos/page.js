'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterBar from '@/components/ui/FilterBar';

export default function VeiculosPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [veiculos, setVeiculos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);

      const res = await fetch(`/api/frotas?${params}`, { cache: 'no-store' });
      const dados = await res.json();

      if (dados.success) {
        setVeiculos(dados.data);
      }
    } catch (error) {
      console.error('Erro ao carregar veículos:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  async function deletarVeiculo(id) {
    if (!window.confirm('Tem certeza que deseja deletar este veículo?')) return;

    try {
      const res = await fetch(`/api/frotas/${id}`, { method: 'DELETE' });
      const dados = await res.json();

      if (dados.success) {
        setVeiculos(veiculos.filter((v) => v.id !== id));
      } else {
        alert('Erro ao deletar veículo');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar veículo');
    }
  }

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Parado', label: 'Parado' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Descartado', label: 'Descartado' }
  ];

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <PageHeader title="Veículos" subtitle="Gerencie todos os veículos da frota" />
        <Link href="/frotas/veiculos/novo">
          <button style={{
            padding: '0.5rem 1rem',
            background: 'var(--color-accent-cyan)',
            color: 'var(--color-bg-primary)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
            transform: 'translateY(0)',
            boxShadow: '0 2px 4px rgba(0, 212, 255, 0.1)'
          }} onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)'; }} onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 4px rgba(0, 212, 255, 0.1)'; }}>
            + Novo Veículo
          </button>
        </Link>
      </div>

      {/* Filtros */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa ou modelo..."
        selectOptions={{ status: statusOptions }}
      />

      {/* Tabela */}
      <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border-light)', marginTop: '2rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando veículos...</div>
        ) : veiculos.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum veículo encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ano</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((veiculo) => (
                  <tr key={veiculo.id} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono'" }}>
                      {veiculo.placa}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                      {veiculo.modelo}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)' }}>
                      {veiculo.ano}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'" }}>
                      {veiculo.kmAtual.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <StatusBadge status={veiculo.status} />
                    </td>
                    <td style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
                      <Link href={`/frotas/veiculos/${veiculo.id}`}>
                        <button style={{
                          padding: '0.5rem 1rem',
                          background: 'var(--color-accent-cyan)',
                          color: 'var(--color-bg-primary)',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: '700',
                          transition: 'all 0.2s',
                          transform: 'translateY(0)',
                          boxShadow: '0 2px 4px rgba(0, 212, 255, 0.1)'
                        }} onMouseEnter={(e) => { e.target.style.transform = 'translateY(-2px)'; e.target.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.3)'; }} onMouseLeave={(e) => { e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = '0 2px 4px rgba(0, 212, 255, 0.1)'; }}>
                          Editar
                        </button>
                      </Link>
                      <button
                        onClick={() => deletarVeiculo(veiculo.id)}
                        style={{
                          padding: '0.5rem 1rem',
                          background: 'transparent',
                          color: 'var(--color-text-secondary)',
                          border: '1px solid var(--color-border-light)',
                          borderRadius: '8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: '700',
                          transition: 'all 0.2s',
                          transform: 'translateY(0)'
                        }} onMouseEnter={(e) => { e.target.style.borderColor = 'var(--color-accent-cyan)'; e.target.style.color = 'var(--color-accent-cyan)'; e.target.style.transform = 'translateY(-2px)'; }} onMouseLeave={(e) => { e.target.style.borderColor = 'var(--color-border-light)'; e.target.style.color = 'var(--color-text-secondary)'; e.target.style.transform = 'translateY(0)'; }}>
                        Deletar
                      </button>
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


