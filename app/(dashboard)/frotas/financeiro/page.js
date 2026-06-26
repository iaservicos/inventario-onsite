'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
    <DashboardLayout
      title="Financeiro"
      subtitle="Análise de custos, multas e despesas por veículo"
      actions={
        <button
          onClick={() => router.push('/frotas/financeiro-cadastro')}
          style={{
            padding: '0.6rem 1.2rem',
            background: 'var(--color-accent-cyan)',
            color: 'var(--color-bg-primary)',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: '700',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            transition: 'all 0.3s'
          }}
          onMouseOver={(e) => (e.target.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)')}
          onMouseOut={(e) => (e.target.style.boxShadow = 'none')}
        >
          + Cadastrar Despesa
        </button>
      }
    >

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '3rem', marginTop: '3rem' }}>
        <KPICard label="Total Despesas" value={`R$ ${kpis.totalDespesas}`} />
        <KPICard label="Multas" value={kpis.multas} />
        <KPICard label="Manutenções" value={kpis.manutencoes} />
        <KPICard label="Outras Despesas" value={kpis.outras} />
      </div>

      {/* Veículos com Maior Custo */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden', marginBottom: '2rem' }}>
        <div style={{ padding: '2rem', borderBottom: '1px solid var(--color-border-light)' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent-cyan)', margin: 0 }}>
            Top 10 Veículos com Maior Custo
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Multas</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manutenção</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Outras</th>
                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {topVeiculos.map((v, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                  <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono'" }}>{v.placa}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.multas.toFixed(2)}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.manutencoes.toFixed(2)}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.outras.toFixed(2)}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-accent-cyan)', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>R$ {v.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {topVeiculos.length === 0 && (
            <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Filtro */}
      <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por placa..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 1rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.9rem' }}
        />
        <select
          value={filters.tipo}
          onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
          style={{ padding: '0.5rem 1rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.9rem', minWidth: '140px' }}
        >
          <option value="">Todos os tipos</option>
          <option value="multa">Multas</option>
          <option value="manutencao">Manutenções</option>
          <option value="outro">Outras Despesas</option>
        </select>
      </div>

      {/* Tabela de Despesas */}
      <div style={{ background: 'var(--color-bg-secondary)', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border-light)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Nenhuma despesa encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border-light)', background: 'var(--color-bg-secondary)' }}>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descrição</th>
                  <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((d, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--color-border-light)' }}>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontSize: '0.9rem' }}>
                      {d.data_despesa ? new Date(d.data_despesa).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', fontWeight: '600', color: 'var(--color-text-secondary)', fontFamily: "'JetBrains Mono'" }}>
                      {d.placa}
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        whiteSpace: 'nowrap',
                        background: 'var(--color-bg-primary)',
                        color: 'var(--color-text-secondary)',
                        border: '1px solid var(--color-border-light)'
                      }}>
                        {d.tipo === 'multa' ? 'Multa' : d.tipo === 'manutencao' ? 'Manutenção' : 'Outra'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)' }}>
                      {d.descricao || '-'}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', color: 'var(--color-accent-cyan)', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {(parseFloat(d.valor) || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function KPICard({ label, value }) {
  return (
    <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem', borderTop: '3px solid var(--color-accent-cyan)', cursor: 'pointer', transition: 'all 0.3s', transform: 'translateY(0)' }} onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 212, 255, 0.2)'; }} onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: 'var(--color-accent-cyan)' }}>
        {value}
      </div>
    </div>
  );
}


