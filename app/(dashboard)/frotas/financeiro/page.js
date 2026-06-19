'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

export default function FinanceiroPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', tipo: '' });
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/despesas/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setDespesas(dados.data || []);
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

  const filtrados = despesas.filter(d => {
    const matchSearch = !filters.search ||
      (d.placa && d.placa.toUpperCase().includes(filters.search.toUpperCase()));
    const matchTipo = !filters.tipo || d.tipo === filters.tipo;
    return matchSearch && matchTipo;
  });

  const kpis = {
    totalDespesas: filtrados.reduce((sum, d) => sum + (parseFloat(d.valor) || 0), 0).toFixed(2),
    multas: filtrados.filter(d => d.tipo === 'multa').length,
    manutencoes: filtrados.filter(d => d.tipo === 'manutencao').length,
    outras: filtrados.filter(d => d.tipo === 'outro').length
  };

  const rankingVeiculos = {};
  filtrados.forEach(d => {
    if (!rankingVeiculos[d.placa]) {
      rankingVeiculos[d.placa] = { placa: d.placa, total: 0, multas: 0, manutencoes: 0, outras: 0 };
    }
    rankingVeiculos[d.placa].total += parseFloat(d.valor) || 0;
    if (d.tipo === 'multa') rankingVeiculos[d.placa].multas += parseFloat(d.valor) || 0;
    else if (d.tipo === 'manutencao') rankingVeiculos[d.placa].manutencoes += parseFloat(d.valor) || 0;
    else rankingVeiculos[d.placa].outras += parseFloat(d.valor) || 0;
  });

  const topVeiculos = Object.values(rankingVeiculos)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <PageHeader title="Financeiro" subtitle="Análise de custos, multas e despesas por veículo" />
        <button
          onClick={() => router.push('/frotas/financeiro-cadastro')}
          style={{
            padding: '0.6rem 1.2rem',
            background: '#000000',
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => (e.target.style.background = '#222222')}
          onMouseOut={(e) => (e.target.style.background = '#000000')}
        >
          + Cadastrar Despesa
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        <KPICard label="Total Despesas" value={`R$ ${kpis.totalDespesas}`} />
        <KPICard label="Multas" value={kpis.multas} />
        <KPICard label="Manutenções" value={kpis.manutencoes} />
        <KPICard label="Outras Despesas" value={kpis.outras} />
      </div>

      {/* Veículos com Maior Custo */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e5e5' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#000000', margin: 0 }}>
            Top 10 Veículos com Maior Custo
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multas</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manutenção</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outras</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {topVeiculos.map((v, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                  <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333', fontFamily: "'JetBrains Mono'" }}>{v.placa}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.multas.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.manutencoes.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.outras.toFixed(2)}</td>
                  <td style={{ padding: '0.75rem 1rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topVeiculos.length === 0 && (
            <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.85rem' }}>
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Filtro */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por placa..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
        />
        <select
          value={filters.tipo}
          onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', minWidth: '140px' }}
        >
          <option value="">Todos os tipos</option>
          <option value="multa">Multas</option>
          <option value="manutencao">Manutenções</option>
          <option value="outro">Outras Despesas</option>
        </select>
      </div>

      {/* Tabela de Despesas */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhuma despesa encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {d.data_despesa ? new Date(d.data_despesa).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333', fontFamily: "'JetBrains Mono'" }}>
                      {d.placa}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: '#f0f0f0',
                        color: '#333333',
                        border: '1px solid #dddddd'
                      }}>
                        {d.tipo === 'multa' ? 'Multa' : d.tipo === 'manutencao' ? 'Manutenção' : 'Outra'}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>
                      {d.descricao || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {(parseFloat(d.valor) || 0).toFixed(2)}
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
    <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1.5rem', borderTop: '3px solid #333333' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#000000' }}>
        {value}
      </div>
    </div>
  );
}
