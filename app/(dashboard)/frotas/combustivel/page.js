'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function CombustvelPage() {
  const [filters, setFilters] = useState({ search: '', periodo: '' });
  const [combustivel, setCombustivel] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        // Simula consumo de combustível
        const combustivel = dados.data.flatMap((f, idx) =>
          Array.from({ length: 4 }, (_, i) => ({
            id: `${f.id}-${i}`,
            placa: f.placa,
            modelo: f.modelo,
            data: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            litros: (20 + Math.random() * 30).toFixed(2),
            valor: (150 + Math.random() * 250).toFixed(2),
            kmRodado: (500 + Math.random() * 500).toFixed(0),
            consumoMedio: ((500 + Math.random() * 500) / (20 + Math.random() * 30)).toFixed(2)
          }))
        );
        setCombustivel(combustivel.sort((a, b) => new Date(b.data) - new Date(a.data)));
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

  const filtrados = combustivel.filter(c =>
    c.placa.toUpperCase().includes(filters.search.toUpperCase())
  );

  const stats = {
    totalLitros: (filtrados.reduce((acc, c) => acc + parseFloat(c.litros), 0)).toFixed(2),
    totalGasto: (filtrados.reduce((acc, c) => acc + parseFloat(c.valor), 0)).toFixed(2),
    registros: filtrados.length,
    consumoMedio: (filtrados.reduce((acc, c) => acc + parseFloat(c.consumoMedio), 0) / Math.max(1, filtrados.length)).toFixed(2)
  };

  const periodoOptions = [
    { value: '', label: 'Todos' },
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' }
  ];

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Consumo de Combustível" subtitle="Análise de consumo e gastos com combustível" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard label="Total (L)" value={stats.totalLitros} />
        <KPICard label="Gasto (R$)" value={`R$ ${stats.totalGasto}`} />
        <KPICard label="Consumo Médio" value={`${stats.consumoMedio} km/L`} />
        <KPICard label="Registros" value={stats.registros} />
      </div>

      {/* Filtro */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa..."
        selectOptions={{ periodo: periodoOptions }}
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
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Litros</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor (R$)</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM Rodado</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consumo (km/L)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                      {new Date(c.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#0369a1' }}>{c.placa}</td>
                    <td style={{ padding: '1rem', color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>
                      {parseFloat(c.litros).toFixed(1)}L
                    </td>
                    <td style={{ padding: '1rem', color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>
                      R$ {parseFloat(c.valor).toFixed(2)}
                    </td>
                    <td style={{ padding: '1rem', color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>
                      {c.kmRodado}
                    </td>
                    <td style={{ padding: '1rem', color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>
                      {c.consumoMedio}
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
