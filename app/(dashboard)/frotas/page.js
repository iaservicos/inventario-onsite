'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import FilterBar from '@/components/ui/FilterBar';

export default function FrotasPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [frotas, setFrotas] = useState([]);
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
        setFrotas(dados.data);
      }
    } catch (error) {
      console.error('Erro ao carregar frotas:', error);
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
        setFrotas(frotas.filter((v) => v.id !== id));
      } else {
        alert('Erro ao deletar veículo');
      }
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar veículo');
    }
  }

  const stats = {
    total: frotas.length,
    ativos: frotas.filter((f) => f.status === 'Ativo').length,
    manutencao: frotas.filter((f) => f.status === 'Manutenção').length,
    parados: frotas.filter((f) => f.status === 'Parado').length
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Ativo', label: 'Ativo' },
    { value: 'Parado', label: 'Parado' },
    { value: 'Manutenção', label: 'Manutenção' },
    { value: 'Descartado', label: 'Descartado' }
  ];

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%' }}>
      <PageHeader title="Gestão de Frotas" subtitle="Gerencie todos os veículos da frota" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <KPICard label="Total" value={stats.total} />
        <KPICard label="Ativos" value={stats.ativos} />
        <KPICard label="Manutenção" value={stats.manutencao} />
        <KPICard label="Parados" value={stats.parados} />
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
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando frotas...</div>
        ) : frotas.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhum veículo encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Placa
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Modelo
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Ano
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    KM
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {frotas.map((frota) => (
                  <tr key={frota.id} style={{ borderBottom: '1px solid var(--color-border-light)', transition: 'background-color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono'" }}>
                      {frota.placa}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)' }}>
                      {frota.modelo}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)' }}>
                      {frota.ano}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'" }}>
                      {frota.kmAtual.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <StatusBadge status={frota.status} />
                    </td>
                    <td style={{ padding: '1rem 1.5rem', display: 'flex', gap: '0.75rem' }}>
                      <Link href={`/frotas/veiculos/${frota.id}`}>
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
                        onClick={() => deletarVeiculo(frota.id)}
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

function KPICard({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'all 0.3s', transform: 'translateY(0)', boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }} onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)'; }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
        {value}
      </div>
    </div>
  );
}


