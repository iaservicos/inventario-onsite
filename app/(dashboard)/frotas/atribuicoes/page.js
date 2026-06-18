'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function AtribuicoesPage() {
  const [filters, setFilters] = useState({ search: '' });
  const [atribuicoes, setAtribuicoes] = useState([]);
  const [frotas, setFrotas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setFrotas(dados.data);
        // Simula atribuições de técnicos
        const tecnicos = ['João Silva', 'Maria Santos', 'Pedro Oliveira'];
        const atribuicoes = dados.data.map((f, idx) => ({
          id: f.id,
          placa: f.placa,
          modelo: f.modelo,
          tecnico: tecnicos[idx % tecnicos.length],
          dataAtribuicao: new Date(Date.now() - idx * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: idx % 2 === 0 ? 'Ativo' : 'Disponível'
        }));
        setAtribuicoes(atribuicoes);
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

  const filtrados = atribuicoes.filter(a =>
    a.placa.toUpperCase().includes(filters.search.toUpperCase()) ||
    a.tecnico.toUpperCase().includes(filters.search.toUpperCase())
  );

  const stats = {
    ativos: atribuicoes.filter(a => a.status === 'Ativo').length,
    disponiveis: atribuicoes.filter(a => a.status === 'Disponível').length,
    total: atribuicoes.length
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Atribuição de Técnicos" subtitle="Gerencie técnicos responsáveis pelos veículos" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard label="Ativos" value={stats.ativos} color="#059669" />
        <KPICard label="Disponíveis" value={stats.disponiveis} color="#0369a1" />
        <KPICard label="Total" value={stats.total} color="#666" />
      </div>

      {/* Filtro */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa ou técnico..."
      />

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Técnico Responsável</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Atribuição</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0369a1' }}>{a.placa}</td>
                    <td style={{ padding: '1rem', color: '#0f172a' }}>{a.modelo}</td>
                    <td style={{ padding: '1rem', color: '#475569' }}>{a.tecnico}</td>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                      {new Date(a.dataAtribuicao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: a.status === 'Ativo' ? 'rgba(5,150,105,.1)' : 'rgba(3,105,161,.1)',
                        color: a.status === 'Ativo' ? '#059669' : '#0369a1'
                      }}>
                        {a.status}
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

function KPICard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color }}>
        {value}
      </div>
    </div>
  );
}
