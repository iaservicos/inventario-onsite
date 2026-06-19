'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustivelMotoristasPage() {
  const [motoristas, setMotoristas] = useState([]);
  const [combustivelBruto, setCombustivelBruto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    mes: new Date().toISOString().substring(0, 7),
    produto: '',
    uf: ''
  });
  const [sort, setSort] = useState({ por: 'gasto', ordem: 'desc' });
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        // Filtrar por critérios
        const dadosFiltrados = dados.data.filter(c => {
          const matchMes = !filters.mes || new Date(c.data).toISOString().substring(0, 7) === filters.mes;
          const matchProduto = !filters.produto || (c.produto && c.produto.toLowerCase() === filters.produto.toLowerCase());
          const matchUf = !filters.uf || (c.uf && c.uf === filters.uf);
          return matchMes && matchProduto && matchUf;
        });

        // Processar dados dos motoristas
        const tecnicos = {};
        dadosFiltrados.forEach(c => {
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
        setCombustivelBruto(dados.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  let filtrados = motoristas.filter(m =>
    m.nome.toUpperCase().includes(filters.search.toUpperCase())
  );

  // Aplicar ordenação
  filtrados = [...filtrados].sort((a, b) => {
    let valorA, valorB;

    switch (sort.por) {
      case 'nome':
        valorA = a.nome.toLowerCase();
        valorB = b.nome.toLowerCase();
        return sort.ordem === 'asc' ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      case 'consumo':
        valorA = parseFloat(a.consumoMedio);
        valorB = parseFloat(b.consumoMedio);
        return sort.ordem === 'asc' ? valorA - valorB : valorB - valorA;
      case 'litros':
        valorA = a.totalLitros;
        valorB = b.totalLitros;
        return sort.ordem === 'asc' ? valorA - valorB : valorB - valorA;
      case 'km':
        valorA = a.totalKm;
        valorB = b.totalKm;
        return sort.ordem === 'asc' ? valorA - valorB : valorB - valorA;
      case 'abastecimentos':
        valorA = a.abastecimentos;
        valorB = b.abastecimentos;
        return sort.ordem === 'asc' ? valorA - valorB : valorB - valorA;
      case 'uf':
        valorA = a.uf.toLowerCase();
        valorB = b.uf.toLowerCase();
        return sort.ordem === 'asc' ? valorA.localeCompare(valorB) : valorB.localeCompare(valorA);
      case 'gasto':
      default:
        valorA = a.gasto;
        valorB = b.gasto;
        return sort.ordem === 'asc' ? valorA - valorB : valorB - valorA;
    }
  });

  // Obter valores únicos para filtros
  const produtosUnicos = [...new Set(combustivelBruto.map(c => c.produto).filter(Boolean))].sort();
  const ufsUnicos = [...new Set(combustivelBruto.map(c => c.uf).filter(Boolean))].sort();

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

      {/* Filtros e Ordenação */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
        {/* Linha Principal */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              padding: '0.5rem 0.75rem',
              background: showFilters ? '#333333' : '#f5f5f5',
              color: showFilters ? '#ffffff' : '#333333',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            ⚙️ Filtros Avançados
          </button>
        </div>

        {/* Filtros Avançados - Expansível */}
        {showFilters && (
          <div style={{ paddingTop: '1rem', borderTop: '1px solid #e5e5e5', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Mês
              </label>
              <input
                type="month"
                value={filters.mes}
                onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Tipo de Combustível
              </label>
              <select
                value={filters.produto}
                onChange={(e) => setFilters({ ...filters, produto: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              >
                <option value="">Todos</option>
                {produtosUnicos.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#666666', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Estado (UF)
              </label>
              <select
                value={filters.uf}
                onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
                style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }}
              >
                <option value="">Todos</option>
                {ufsUnicos.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Ordenação */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid #e5e5e5' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#333333' }}>Ordenar por:</span>
          <select
            value={sort.por}
            onChange={(e) => setSort({ ...sort, por: e.target.value })}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
          >
            <option value="gasto">Gasto Total</option>
            <option value="consumo">Consumo (km/L)</option>
            <option value="litros">Total Litros</option>
            <option value="km">Total KM</option>
            <option value="abastecimentos">Abastecimentos</option>
            <option value="nome">Nome</option>
            <option value="uf">Estado (UF)</option>
          </select>

          <select
            value={sort.ordem}
            onChange={(e) => setSort({ ...sort, ordem: e.target.value })}
            style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
          >
            <option value="desc">↓ Decrescente (Maior)</option>
            <option value="asc">↑ Crescente (Menor)</option>
          </select>
        </div>
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
