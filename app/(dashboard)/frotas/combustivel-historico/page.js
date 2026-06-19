'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustivelHistoricoPage() {
  const [combustiveis, setCombustiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimoMes, setUltimoMes] = useState(new Date().toISOString().substring(0, 7));
  const [filters, setFilters] = useState({ search: '', motorista: '', mes: '', produto: '', uf: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        const dados_arr = dados.data || [];
        setCombustiveis(dados_arr);

        // Detectar último mês com dados
        if (dados_arr.length > 0) {
          const meses = dados_arr
            .map(c => new Date(c.data).toISOString().substring(0, 7))
            .filter(Boolean);
          const mesUnico = [...new Set(meses)].sort().reverse()[0];
          setUltimoMes(mesUnico);

          // Atualizar filtro com o último mês encontrado
          if (!filters.mes) {
            setFilters(prev => ({ ...prev, mes: mesUnico }));
          }
        }
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

  const mesFiltro = filters.mes || ultimoMes;
  const filtrados = combustiveis.filter(c => {
    const matchSearch = !filters.search ||
      (c.placa && c.placa.toUpperCase().includes(filters.search.toUpperCase()));
    const matchMotorista = !filters.motorista ||
      (c.motorista && c.motorista.toUpperCase().includes(filters.motorista.toUpperCase()));
    const matchMes = c.data && new Date(c.data).toISOString().substring(0, 7) === mesFiltro;
    const matchProduto = !filters.produto || (c.produto && c.produto.toLowerCase() === filters.produto.toLowerCase());
    const matchUf = !filters.uf || (c.uf && c.uf === filters.uf);
    return matchSearch && matchMotorista && matchMes && matchProduto && matchUf;
  });

  const motoristasUnicos = [...new Set(combustiveis.map(c => c.motorista).filter(Boolean))].sort();
  const produtosUnicos = [...new Set(combustiveis.map(c => c.produto).filter(Boolean))].sort();
  const ufsUnicos = [...new Set(combustiveis.map(c => c.uf).filter(Boolean))].sort();

  const stats = {
    totalAbastecimentos: filtrados.length,
    totalLitros: filtrados.reduce((sum, c) => sum + (parseFloat(c.quantidade) || 0), 0).toFixed(1),
    totalGasto: filtrados.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0).toFixed(2)
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Histórico de Abastecimentos"
        subtitle="Quem abasteceu cada veículo - data, horário, motorista e valores"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <StatCard label="Total Abastecimentos" value={stats.totalAbastecimentos} />
        <StatCard label="Total Litros" value={`${stats.totalLitros}L`} />
        <StatCard label="Total Gasto" value={`R$ ${stats.totalGasto}`} />
      </div>

      {/* Filtros */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por placa..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
          />

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#666666', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Motorista</label>
            <select
              value={filters.motorista}
              onChange={(e) => setFilters({ ...filters, motorista: e.target.value })}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', minWidth: '160px' }}
            >
              <option value="">Todos</option>
              {motoristasUnicos.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#666666', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Mês</label>
            <input
              type="month"
              value={filters.mes || ultimoMes}
              onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#666666', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Combustível</label>
            <select
              value={filters.produto}
              onChange={(e) => setFilters({ ...filters, produto: e.target.value })}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
            >
              <option value="">Todos</option>
              {produtosUnicos.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '600', color: '#666666', display: 'block', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Estado</label>
            <select
              value={filters.uf}
              onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
              style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
            >
              <option value="">Todos</option>
              {ufsUnicos.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e5e5', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 400px)' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhum abastecimento encontrado</div>
        ) : (
          <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '1100px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quem Abasteceu</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produto</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Terminal</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cidade</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Litros</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor Unit.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor Total</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Consumo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hodômetro</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {c.data ? new Date(c.data).toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333', fontFamily: "'JetBrains Mono'" }}>
                      {c.placa}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#000000' }}>
                      {c.motorista}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>
                      {c.produto || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.85rem' }}>
                      {c.terminal || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>
                      {c.cidade || '-'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {(parseFloat(c.quantidade) || 0).toFixed(1)}L
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {(parseFloat(c.valor_unitario) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      R$ {(parseFloat(c.valor_total) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {(parseFloat(c.consumo) || 0).toFixed(2)} km/L
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right' }}>
                      {c.hodometro || '-'}
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
