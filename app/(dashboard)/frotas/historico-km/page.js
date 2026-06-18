'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function HistoricoKmPage() {
  const [filters, setFilters] = useState({ search: '' });
  const [historico, setHistorico] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        // Gera histórico simulado a partir dos dados
        const historico = dados.data.map((f, idx) => ({
          id: f.id,
          placa: f.placa,
          modelo: f.modelo,
          kmAtual: f.kmAtual,
          data: new Date(Date.now() - idx * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          motorista: ['João Silva', 'Maria Santos', 'Pedro Oliveira'][idx % 3],
          consumo: (f.kmAtual / 8).toFixed(1)
        }));
        setHistorico(historico.sort((a, b) => new Date(b.data) - new Date(a.data)));
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

  const filtrados = historico.filter(h =>
    h.placa.toUpperCase().includes(filters.search.toUpperCase()) ||
    h.motorista.toUpperCase().includes(filters.search.toUpperCase())
  );

  const stats = {
    kmTotal: historico.reduce((acc, h) => acc + h.kmAtual, 0),
    veiculos: new Set(historico.map(h => h.placa)).size,
    registros: historico.length
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Histórico de KM" subtitle="Registro de quilometragem e consumo" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard label="KM Total" value={stats.kmTotal.toLocaleString('pt-BR')} />
        <KPICard label="Veículos" value={stats.veiculos} />
        <KPICard label="Registros" value={stats.registros} />
      </div>

      {/* Filtro */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa ou motorista..."
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
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motorista</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>KM</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consumo (L)</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((h) => (
                  <tr key={`${h.placa}-${h.data}`} style={{ borderBottom: '1px solid #eeeeee' }}>
                    <td style={{ padding: '1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(h.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem', fontWeight: '700', color: '#333333' }}>{h.placa}</td>
                    <td style={{ padding: '1rem', color: '#333333' }}>{h.modelo}</td>
                    <td style={{ padding: '1rem', color: '#666666' }}>{h.motorista}</td>
                    <td style={{ padding: '1rem', color: '#333333', fontFamily: "'JetBrains Mono'" }}>
                      {h.kmAtual.toLocaleString('pt-BR')}
                    </td>
                    <td style={{ padding: '1rem', color: '#333333', fontFamily: "'JetBrains Mono'" }}>
                      {h.consumo}
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
