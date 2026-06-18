'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function ManutencaoPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [manutencoes, setManutencoes] = useState([]);
  const [frotas, setFrotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setFrotas(dados.data);
        // Gera relatório de manutenção a partir dos dados
        const manutencoes = dados.data
          .filter(f => f.ultimaManutencao || f.proximaManutencao)
          .map(f => ({
            id: f.id,
            placa: f.placa,
            modelo: f.modelo,
            ultima: f.ultimaManutencao,
            proxima: f.proximaManutencao,
            km: f.kmAtual,
            status: new Date(f.proximaManutencao) < new Date() ? 'Vencida' : 'Próxima'
          }));
        setManutencoes(manutencoes);
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

  const filtrados = manutencoes.filter(m =>
    m.placa.toUpperCase().includes(filters.search.toUpperCase()) &&
    (!filters.status || m.status === filters.status)
  );

  const stats = {
    vencidas: manutencoes.filter(m => m.status === 'Vencida').length,
    proximas: manutencoes.filter(m => m.status === 'Próxima').length,
    total: manutencoes.length
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Vencida', label: 'Vencida' },
    { value: 'Próxima', label: 'Próxima' }
  ];

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Manutenção de Frotas" subtitle="Controle de manutenção preventiva" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard label="Vencidas" value={stats.vencidas} />
        <KPICard label="Próximas" value={stats.proximas} />
        <KPICard label="Total" value={stats.total} />
      </div>

      {/* Filtros */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa..."
        selectOptions={{ status: statusOptions }}
      />

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #eeeeee', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM Atual</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Última Manutenção</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Manutenção</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #eeeeee' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#333333' }}>{m.placa}</td>
                    <td style={{ padding: '1rem', color: '#333333' }}>{m.modelo}</td>
                    <td style={{ padding: '1rem', color: '#666666' }}>{m.km.toLocaleString('pt-BR')} km</td>
                    <td style={{ padding: '1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {m.ultima ? new Date(m.ultima).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {m.proxima ? new Date(m.proxima).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '3px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: m.status === 'Vencida' ? '#000000' : '#999999',
                        color: '#ffffff'
                      }}>
                        {m.status === 'Vencida' ? 'Vencida' : 'Ativa'}
                      </span>
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
    <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000' }}>
        {value}
      </div>
    </div>
  );
}
