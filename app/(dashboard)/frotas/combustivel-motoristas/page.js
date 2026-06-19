'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustivelMotoristasPage() {
  const [motoristas, setMotoristas] = useState([]);
  const [combustivelBruto, setCombustivelBruto] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ultimoMes, setUltimoMes] = useState(new Date().toISOString().substring(0, 7));
  const [filters, setFilters] = useState({
    search: '',
    mes: '',
    produto: '',
    uf: ''
  });
  const [sort, setSort] = useState({ por: 'gasto', ordem: 'desc' });
  const [motoristaSelecionado, setMotoristaSelecionado] = useState(null);
  const [historicoMotorista, setHistoricoMotorista] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setCombustivelBruto(dados.data || []);

        // Detectar último mês com dados
        if (dados.data && dados.data.length > 0) {
          const meses = dados.data
            .map(c => new Date(c.data).toISOString().substring(0, 7))
            .filter(Boolean);
          const mesUnico = [...new Set(meses)].sort().reverse()[0];
          setUltimoMes(mesUnico);

          // Atualizar filtro com o último mês encontrado
          if (!filters.mes) {
            setFilters(prev => ({ ...prev, mes: mesUnico }));
          }
        }

        // Filtrar por critérios (usar ultimoMes se nenhum mês foi selecionado)
        const mesFiltro = filters.mes || ultimoMes;
        const dadosFiltrados = dados.data.filter(c => {
          const matchMes = new Date(c.data).toISOString().substring(0, 7) === mesFiltro;
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
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, ultimoMes]);

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

  const abrirHistoricoMotorista = (nomeMotorista) => {
    const mesFiltro = filters.mes || ultimoMes;
    const historico = combustivelBruto.filter(c =>
      c.motorista === nomeMotorista &&
      new Date(c.data).toISOString().substring(0, 7) === mesFiltro
    );
    setHistoricoMotorista(historico);
    setMotoristaSelecionado(nomeMotorista);
  };

  const fecharHistorico = () => {
    setMotoristaSelecionado(null);
    setHistoricoMotorista([]);
  };

  // Formatadores
  const formatarMoeda = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
  };

  const formatarNumero = (valor) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.floor(valor));
  };

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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <StatCard label="Total Motoristas" value={formatarNumero(stats.totalMotoristas)} />
        <StatCard label="Gasto Total" value={formatarMoeda(stats.gastoTotal)} />
        <StatCard label="Total KM Rodado" value={formatarNumero(filtrados.reduce((sum, m) => sum + m.totalKm, 0))} unit="km" />
        <StatCard label="Consumo Médio Geral" value={`${stats.consumoMedioGeral} km/L`} />
      </div>

      {/* Filtros e Ordenação */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '6px', padding: '1rem', marginBottom: '1rem' }}>
        {/* Linha 1: Busca e Filtros Básicos */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem' }}
          />

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

        {/* Linha 2: Ordenação */}
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
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa', cursor: 'pointer', transition: 'background-color 0.2s' }} onClick={() => abrirHistoricoMotorista(m.nome)} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'} onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#ffffff' : '#fafafa'}>
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

      {/* Painel Lateral Histórico do Motorista */}
      {motoristaSelecionado && (
        <>
          {/* Overlay */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.3)',
              zIndex: 999
            }}
            onClick={fecharHistorico}
          />
          {/* Painel */}
          <div style={{
            position: 'fixed',
            right: 0,
            top: 0,
            bottom: 0,
            width: '500px',
            background: '#ffffff',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideIn 0.3s ease-in-out',
            '@keyframes slideIn': {
              from: { transform: 'translateX(100%)' },
              to: { transform: 'translateX(0)' }
            }
          }}>
            {/* Header */}
            <div style={{ padding: '1.5rem', borderBottom: '1px solid #e5e5e5', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#000000', margin: 0, wordBreak: 'break-word' }}>
                {motoristaSelecionado}
              </h2>
              <button
                onClick={fecharHistorico}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#999999',
                  padding: 0,
                  marginLeft: '1rem',
                  flexShrink: 0
                }}
              >
                ✕
              </button>
            </div>

            {/* Content - Scrollable */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Gasto</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0))}
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total Litros</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.quantidade) || 0), 0).toFixed(1)}L
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Total KM</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {new Intl.NumberFormat('pt-BR').format(Math.floor(historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.distancia) || 0), 0)))} km
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Abastecimentos</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {historicoMotorista.length}
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Consumo Médio</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {historicoMotorista.length > 0 && historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.quantidade) || 0), 0) > 0
                      ? (historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.distancia) || 0), 0) / historicoMotorista.reduce((sum, c) => sum + (parseFloat(c.quantidade) || 0), 0)).toFixed(2)
                      : '0.00'
                    } km/L
                  </div>
                </div>
                <div style={{ background: '#f5f5f5', padding: '0.75rem', borderRadius: '4px' }}>
                  <div style={{ fontSize: '0.65rem', color: '#999999', fontWeight: '600', textTransform: 'uppercase', marginBottom: '0.3rem' }}>Hodômetro</div>
                  <div style={{ fontSize: '1rem', fontWeight: '700', color: '#000000' }}>
                    {historicoMotorista.length > 0
                      ? new Intl.NumberFormat('pt-BR').format(Math.max(...historicoMotorista.map(c => parseInt(c.hodometro) || 0)))
                      : '0'
                    } km
                  </div>
                </div>
              </div>

              {/* Tabela */}
              <div style={{ overflowX: 'auto', marginTop: '1.5rem', borderTop: '1px solid #e5e5e5', paddingTop: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#000000', marginBottom: '1rem' }}>Histórico de Abastecimentos</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Data</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Placa</th>
                      <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Produto</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Litros</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Vl.Total</th>
                      <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#000000', fontSize: '0.65rem' }}>Consumo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historicoMotorista.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.8rem' }}>
                          Nenhum abastecimento encontrado
                        </td>
                      </tr>
                    ) : (
                      historicoMotorista.map((c, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #f0f0f0', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                          <td style={{ padding: '0.5rem', color: '#666666', fontSize: '0.7rem' }}>
                            {c.data ? new Date(c.data).toLocaleDateString('pt-BR') : '-'}
                          </td>
                          <td style={{ padding: '0.5rem', fontWeight: '600', color: '#333333', fontFamily: "'JetBrains Mono'", fontSize: '0.7rem' }}>
                            {c.placa}
                          </td>
                          <td style={{ padding: '0.5rem', color: '#666666', fontSize: '0.7rem' }}>
                            {c.produto || '-'}
                          </td>
                          <td style={{ padding: '0.5rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right', fontSize: '0.7rem' }}>
                            {(parseFloat(c.quantidade) || 0).toFixed(1)}L
                          </td>
                          <td style={{ padding: '0.5rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'", textAlign: 'right', fontSize: '0.7rem' }}>
                            R$ {(parseFloat(c.valor_total) || 0).toFixed(2)}
                          </td>
                          <td style={{ padding: '0.5rem', color: '#666666', fontFamily: "'JetBrains Mono'", textAlign: 'right', fontSize: '0.7rem' }}>
                            {(parseFloat(c.consumo) || 0).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, unit }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1.5rem', borderTop: '3px solid #333333' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
        <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000', lineHeight: '1' }}>
          {value}
        </div>
        {unit && <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#999999' }}>{unit}</div>}
      </div>
    </div>
  );
}
