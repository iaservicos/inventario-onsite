'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function InspecaoPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [inspecoes, setInspecoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        const inspecoes = dados.data.map((f, idx) => ({
          id: f.id,
          placa: f.placa,
          modelo: f.modelo,
          dataInspecao: new Date(Date.now() - idx * 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          proximaInspecao: new Date(Date.now() + (90 - idx * 15) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          pneusOK: idx % 2 === 0,
          freiosOK: idx % 3 === 0,
          olitoOK: idx % 4 === 0,
          luzesDOK: true,
          documentacaoOK: idx % 2 === 0,
          status: idx % 2 === 0 ? 'Aprovado' : 'Pendente'
        }));
        setInspecoes(inspecoes);
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

  const filtrados = inspecoes.filter(i =>
    i.placa.toUpperCase().includes(filters.search.toUpperCase()) &&
    (!filters.status || i.status === filters.status)
  );

  const stats = {
    aprovados: inspecoes.filter(i => i.status === 'Aprovado').length,
    pendentes: inspecoes.filter(i => i.status === 'Pendente').length,
    total: inspecoes.length
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Aprovado', label: 'Aprovado' },
    { value: 'Pendente', label: 'Pendente' }
  ];

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Inspeção de Veículos" subtitle="Acompanhamento de vistoria e condições mecânicas" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <KPICard label="Aprovados" value={stats.aprovados} />
        <KPICard label="Pendentes" value={stats.pendentes} />
        <KPICard label="Total" value={stats.total} />
      </div>

      {/* Filtro */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa..."
        selectOptions={{ status: statusOptions }}
      />

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eeeeee', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhuma inspeção encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Última Inspeção</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Inspeção</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pneus</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Freios</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Óleo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333' }}>{i.placa}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(i.dataInspecao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(i.proximaInspecao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#666666', fontSize: '0.9rem' }}>
                      {i.pneusOK ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#666666', fontSize: '0.9rem' }}>
                      {i.freiosOK ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#666666', fontSize: '0.9rem' }}>
                      {i.olitoOK ? '✓' : '✗'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        background: i.status === 'Aprovado' ? '#000000' : '#999999',
                        color: '#ffffff'
                      }}>
                        {i.status}
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
    <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000' }}>
        {value}
      </div>
    </div>
  );
}
