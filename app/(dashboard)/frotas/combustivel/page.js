

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

export default function CombustvelPage() {
  const router = useRouter();
  const [filters, setFilters] = useState({ search: '', mes: '', uf: '', produto: '', uso: '' });
  const [combustivel, setCombustivel] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/combustivel/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setCombustivel(dados.data || []);
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
    c.placa.toUpperCase().includes(filters.search.toUpperCase()) ||
    c.motorista.toUpperCase().includes(filters.search.toUpperCase())
  );

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
        <KPICard label="Total Gasto" value={`R$ ${stats.totalGasto}`} color="blue" />
        <KPICard label="Litros" value={stats.totalLitros} color="amber" />
        <KPICard label="Média Km/L" value={stats.mediaKmL} color="green" />
        <KPICard label="Abastecimentos" value={stats.abastecimentos} color="blue" />
        <KPICard label="Preço Médio" value={`R$ ${stats.precoMedio}/L`} color="red" />
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
          <option value="Gasolina">Gasolina</option>
          <option value="Diesel">Diesel</option>
          <option value="Arla 32">Arla 32</option>
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

function KPICard({ label, value, color }) {
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
