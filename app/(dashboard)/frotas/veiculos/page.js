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
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <PageHeader title="Veículos" subtitle="Gerencie todos os veículos da frota" />
        <Link href="/frotas/veiculos/novo">
          <button style={{
            padding: '0.5rem 1rem',
            background: '#000000',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontWeight: '700',
            cursor: 'pointer'
          }}>
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
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eeeeee', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando veículos...</div>
        ) : veiculos.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhum veículo encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ano</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {veiculos.map((veiculo) => (
                  <tr key={veiculo.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333', fontFamily: "'JetBrains Mono'" }}>
                      {veiculo.placa}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#333333' }}>
                      {veiculo.modelo}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>
                      {veiculo.ano}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {veiculo.kmAtual.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={veiculo.status} />
                    </td>
                    <td style={{ padding: '0.75rem 1rem', display: 'flex', gap: '0.5rem' }}>
                      <Link href={`/frotas/veiculos/${veiculo.id}`}>
                        <button style={{
                          padding: '0.4rem 0.75rem',
                          background: '#000000',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}>
                          Editar
                        </button>
                      </Link>
                      <button
                        onClick={() => deletarVeiculo(veiculo.id)}
                        style={{
                          padding: '0.4rem 0.75rem',
                          background: '#f0f0f0',
                          color: '#333333',
                          border: '1px solid #e0e0e0',
                          borderRadius: '3px',
                          fontSize: '0.7rem',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}>
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
