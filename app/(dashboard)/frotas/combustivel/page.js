

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustvelPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', mes: '', uf: '', produto: '', uso: '' });
  const [combustivel, setCombustivel] = useState([]);
  const [loading, setLoading] = useState(true);
  const [topTecnicos, setTopTecnicos] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setCombustivel(dados.data || []);

        // Calcular top 5 técnicos que mais gastam
        const tecnicos = {};
        dados.data.forEach(c => {
          if (!tecnicos[c.motorista]) {
            tecnicos[c.motorista] = {
              gasto: 0,
              abastecimentos: 0,
              uf: c.uf || 'N/A'
            };
          }
          tecnicos[c.motorista].gasto += parseFloat(c.valor_total) || 0;
          tecnicos[c.motorista].abastecimentos += 1;
        });
        const top = Object.entries(tecnicos)
          .map(([nome, dados]) => ({
            nome,
            gasto: dados.gasto,
            abastecimentos: dados.abastecimentos,
            uf: dados.uf,
            consumoMedio: (dados.gasto / dados.abastecimentos).toFixed(2)
          }))
          .sort((a, b) => b.gasto - a.gasto)
          .slice(0, 5);
        setTopTecnicos(top);
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

  const filtrados = combustivel.filter(c => {
    // Filtro por placa/motorista
    const matchSearch = !filters.search ||
      (c.placa && c.placa.toUpperCase().includes(filters.search.toUpperCase())) ||
      (c.motorista && c.motorista.toUpperCase().includes(filters.search.toUpperCase()));

    // Filtro por mês
    const matchMes = !filters.mes || (c.data && new Date(c.data).toLocaleDateString('pt-BR').substring(3, 5) === filters.mes);

    // Filtro por UF
    const matchUf = !filters.uf || (c.uf && c.uf.toUpperCase() === filters.uf);

    // Filtro por produto
    const matchProduto = !filters.produto || (c.produto && c.produto.toLowerCase().includes(filters.produto.toLowerCase()));

    // Filtro por uso (se houver campo 'uso' nos dados)
    const matchUso = !filters.uso || !c.uso || c.uso === filters.uso;

    return matchSearch && matchMes && matchUf && matchProduto && matchUso;
  });

  const stats = {
    totalGasto: combustivel.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0).toFixed(2),
    totalLitros: combustivel.reduce((sum, c) => sum + (parseFloat(c.quantidade) || 0), 0).toFixed(2),
    mediaKmL: combustivel.length > 0 ? (combustivel.reduce((sum, c) => sum + (parseFloat(c.consumo) || 0), 0) / combustivel.length).toFixed(2) : '0.00',
    abastecimentos: combustivel.length,
    precoMedio: combustivel.length > 0 ? (combustivel.reduce((sum, c) => sum + (parseFloat(c.valor_unitario) || 0), 0) / combustivel.length).toFixed(2) : '0.00'
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <PageHeader
          title="Combustível Serviço"
          subtitle="Consumo, gastos e eficiência por veículo e motorista"
        />
        <button
          onClick={() => router.push('/frotas/combustivel-import')}
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
          onMouseOut={(e) => (e.target.style.background = '#000000')}>
          Importar Relatório
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        <KPICard label="Total Gasto" value={`R$ ${stats.totalGasto}`} />
        <KPICard label="Litros" value={stats.totalLitros} />
        <KPICard label="Média Km/L" value={stats.mediaKmL} />
        <KPICard label="Abastecimentos" value={stats.abastecimentos} />
        <KPICard label="Preço Médio" value={`R$ ${stats.precoMedio}/L`} />
      </div>

      {/* Motoristas com Maior/Menor Gasto e Top 5 Maiores Consumidores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Maiores Consumidores */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', overflow: 'hidden' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: '#000000' }}>
            Top 5 Maiores Consumidores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topTecnicos.length === 0 ? (
              <div style={{ color: '#999999', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                Nenhum dado
              </div>
            ) : (
              topTecnicos.map((t, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '0.75rem', borderBottom: '1px solid #f5f5f5' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', color: '#000000', fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                      {idx + 1}. {t.nome}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#999999' }}>
                      {t.uf || 'N/A'}
                    </div>
                  </div>
                  <div style={{ fontWeight: '700', color: '#000000', fontFamily: "'JetBrains Mono'", fontSize: '0.85rem' }}>
                    R$ {t.gasto.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Motoristas por Faixa de Consumo */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: '700', marginBottom: '1rem', color: '#000000' }}>
            Motoristas por Consumo
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                <th style={{ padding: '0.5rem', textAlign: 'left', fontWeight: '700', color: '#666666', fontSize: '0.75rem' }}>
                  Motorista
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#666666', fontSize: '0.75rem' }}>
                  Gasto Total
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#666666', fontSize: '0.75rem' }}>
                  Abastecimentos
                </th>
                <th style={{ padding: '0.5rem', textAlign: 'right', fontWeight: '700', color: '#666666', fontSize: '0.75rem' }}>
                  Consumo Médio
                </th>
              </tr>
            </thead>
            <tbody>
              {topTecnicos.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: '#999999' }}>
                    Nenhum dado
                  </td>
                </tr>
              ) : (
                topTecnicos.map((m, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                    <td style={{ padding: '0.5rem', color: '#333333', fontWeight: '600', fontSize: '0.85rem' }}>
                      {m.nome}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                      R$ {m.gasto.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {m.abastecimentos || '-'}
                    </td>
                    <td style={{ padding: '0.5rem', textAlign: 'right', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                      {m.consumoMedio ? `R$ ${m.consumoMedio}` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filtro */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
        <input
          type="text"
          placeholder="Placa ou motorista..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        />
        <select
          value={filters.mes}
          onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        >
          <option value="">Todos meses</option>
          <option value="01">Janeiro</option>
          <option value="02">Fevereiro</option>
          <option value="03">Março</option>
          <option value="04">Abril</option>
          <option value="05">Maio</option>
          <option value="06">Junho</option>
          <option value="07">Julho</option>
          <option value="08">Agosto</option>
          <option value="09">Setembro</option>
          <option value="10">Outubro</option>
          <option value="11">Novembro</option>
          <option value="12">Dezembro</option>
        </select>
        <select
          value={filters.uf}
          onChange={(e) => setFilters({ ...filters, uf: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        >
          <option value="">Todos UF</option>
          <option value="SP">SP</option>
          <option value="RJ">RJ</option>
          <option value="MG">MG</option>
        </select>
        <select
          value={filters.produto}
          onChange={(e) => setFilters({ ...filters, produto: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        >
          <option value="">Todos produtos</option>
          <option value="GASOLINA">Gasolina</option>
          <option value="DIESEL">Diesel</option>
          <option value="ETANOL">Etanol</option>
          <option value="GNV">GNV</option>
          <option value="ARLA">Arla 32</option>
        </select>
        <select
          value={filters.uso}
          onChange={(e) => setFilters({ ...filters, uso: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        >
          <option value="">Serviço + Particular</option>
          <option value="servico">Somente Serviço</option>
          <option value="particular">Somente Particular</option>
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eeeeee' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhum registro encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Motorista</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>UF</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Produto</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Litros</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Km/L</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hodômetro</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vl.Unit.</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vl.Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Filial</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem', color: '#666666', fontSize: '0.85rem' }}>
                      {c.data ? new Date(c.data).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333333' }}>{c.placa}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{c.motorista}</td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontWeight: '600' }}>{c.uf || '-'}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{c.produto || '-'}</td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {(parseFloat(c.quantidade) || 0).toFixed(1)}L
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {(parseFloat(c.consumo) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {c.hodometro || '-'}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      R$ {(parseFloat(c.valor_unitario) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      R$ {(parseFloat(c.valor_total) || 0).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{c.filial || '-'}</td>
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
    <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem', borderTop: '3px solid #333333' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#000000' }}>
        {value}
      </div>
    </div>
  );
}
