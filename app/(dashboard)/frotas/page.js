'use client';

import { useState, useEffect, useCallback } from 'react';
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
    <div>
      <PageHeader title="Gestão de Frotas" subtitle="Gerencie todos os veículos da frota" />

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
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
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Carregando frotas...</div>
        ) : frotas.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Nenhum veículo encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Placa
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Modelo
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Ano
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    KM
                  </th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {frotas.map((frota) => (
                  <tr key={frota.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0369a1', fontFamily: "'JetBrains Mono'" }}>
                      {frota.placa}
                    </td>
                    <td style={{ padding: '1rem', color: '#0f172a' }}>
                      {frota.modelo}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569' }}>
                      {frota.ano}
                    </td>
                    <td style={{ padding: '1rem', color: '#475569', fontFamily: "'JetBrains Mono'" }}>
                      {frota.kmAtual.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <StatusBadge status={frota.status} />
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
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#0f172a' }}>
        {value}
      </div>
    </div>
  );
}
