'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustivelMotoristasPage() {
  const [motoristas, setMotoristas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        // Processar dados dos motoristas
        const tecnicos = {};
        dados.data.forEach(c => {
          if (!tecnicos[c.motorista]) {
            tecnicos[c.motorista] = {
              nome: c.motorista,
              gasto: 0,
              abastecimentos: 0,
              totalLitros: 0,
              totalKm: 0,
              uf: c.uf || 'N/A',
              primeiraAbastecimento: c.data,
              ultimaAbastecimento: c.data
            };
          }
          tecnicos[c.motorista].gasto += parseFloat(c.valor_total) || 0;
          tecnicos[c.motorista].abastecimentos += 1;
          tecnicos[c.motorista].totalLitros += parseFloat(c.quantidade) || 0;
          tecnicos[c.motorista].totalKm += parseFloat(c.distancia) || 0;

          // Atualizar datas
          const dataAtual = new Date(c.data);
          const primeiraDada = new Date(tecnicos[c.motorista].primeiraAbastecimento);
          const ultimaDada = new Date(tecnicos[c.motorista].ultimaAbastecimento);

          if (dataAtual < primeiraDada) {
            tecnicos[c.motorista].primeiraAbastecimento = c.data;
          }
          if (dataAtual > ultimaDada) {
            tecnicos[c.motorista].ultimaAbastecimento = c.data;
          }
        });

        const lista = Object.values(tecnicos)
          .map(t => ({
            ...t,
            consumoMedio: t.totalLitros > 0 ? (t.totalKm / t.totalLitros).toFixed(2) : '0.00',
            gastoMedio: t.abastecimentos > 0 ? (t.gasto / t.abastecimentos).toFixed(2) : '0.00'
          }))
          .sort((a, b) => b.gasto - a.gasto);

        setMotoristas(lista);
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

  const filtrados = motoristas.filter(m =>
    m.nome.toUpperCase().includes(filters.search.toUpperCase())
  );

  const stats = {
    totalMotoristas: filtrados.length,
    gastoTotal: filtrados.reduce((sum, m) => sum + parseFloat(m.gasto), 0).toFixed(2),
    consumoMedioGeral: filtrados.length > 0
      ? (filtrados.reduce((sum, m) => sum + parseFloat(m.consumoMedio), 0) / filtrados.length).toFixed(2)
      : '0.00'
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Motoristas por Consumo"
        subtitle="Análise de eficiência e gastos de cada motorista"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <StatCard label="Total Motoristas" value={stats.totalMotoristas} />
        <StatCard label="Gasto Total" value={`R$ ${stats.gastoTotal}`} />
        <StatCard label="Consumo Médio Geral" value={`${stats.consumoMedioGeral} km/L`} />
      </div>

      {/* Filtro */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ width: '100%', maxWidth: '300px', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
        />
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhum motorista encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motorista</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UF</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Abastecimentos</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Litros</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total KM</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consumo Médio</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gasto Total</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Gasto Médio</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333' }}>
                      {m.nome}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontWeight: '600' }}>
                      {m.uf}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {m.abastecimentos}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {m.totalLitros.toFixed(1)}L
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {m.totalKm.toFixed(0)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {m.consumoMedio} km/L
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {m.gasto.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {m.gastoMedio}
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
    <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1.5rem', borderTop: '3px solid #333333' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000' }}>
        {value}
      </div>
    </div>
  );
}
