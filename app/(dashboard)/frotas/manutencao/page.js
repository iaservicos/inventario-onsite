'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function ManutencaoPage() {
  const [filters, setFilters] = useState({ search: '', tipo: '' });
  const [manutencoes, setManutencoes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas/manutencao/list', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setManutencoes(dados.data || []);
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

  const filtrados = manutencoes.filter(m =>
    (m.placa || '').toUpperCase().includes(filters.search.toUpperCase()) &&
    (!filters.tipo || m.tipo === filters.tipo)
  );

  const kpis = {
    vencidas: filtrados.filter(m => {
      if (!m.proxima_preventiva) return false;
      const proxima = new Date(m.proxima_preventiva);
      return proxima < new Date();
    }).length,
    proximos30: filtrados.filter(m => {
      if (!m.proxima_preventiva) return false;
      const proxima = new Date(m.proxima_preventiva);
      const dias = Math.floor((proxima - new Date()) / (1000 * 60 * 60 * 24));
      return dias >= 0 && dias <= 30;
    }).length,
    emDia: filtrados.filter(m => {
      if (!m.proxima_preventiva) return false;
      const proxima = new Date(m.proxima_preventiva);
      const dias = Math.floor((proxima - new Date()) / (1000 * 60 * 60 * 24));
      return dias > 30;
    }).length
  };

  const tipoOptions = [
    { value: '', label: 'Todos os tipos' },
    { value: 'Revisão', label: 'Revisão' },
    { value: 'Troca de Óleo', label: 'Troca de Óleo' },
    { value: 'IPVA', label: 'IPVA' },
    { value: 'Seguro', label: 'Seguro' },
    { value: 'Pneu', label: 'Pneu' },
    { value: 'Outro', label: 'Outro' }
  ];

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Manutenções"
        subtitle="Histórico e programação de manutenções dos veículos"
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <KPICard label="Vencidas" value={kpis.vencidas} sub="Atenção imediata" />
        <KPICard label="Próx. 30 dias" value={kpis.proximos30} sub="Agendar" />
        <KPICard label="Em dia" value={kpis.emDia} sub="Ok" />
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
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #e5e5e5', borderRadius: '4px', fontSize: '0.9rem', minWidth: '160px' }}
        >
          {tipoOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #e5e5e5', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhuma manutenção encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e5e5', background: '#f5f5f5' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Realiz.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Prev.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor (R$)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, idx) => {
                  let status = 'Em dia';
                  if (m.proxima_preventiva) {
                    const proxima = new Date(m.proxima_preventiva);
                    const dias = Math.floor((proxima - new Date()) / (1000 * 60 * 60 * 24));
                    if (dias < 0) status = 'Vencida';
                    else if (dias <= 30) status = 'Próxima em 30 dias';
                  }

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333' }}>{m.placa}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.tipo}</td>
                      <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                        {m.data_realizada ? new Date(m.data_realizada).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                        {m.proxima_preventiva ? new Date(m.proxima_preventiva).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                        R$ {(parseFloat(m.valor) || 0).toFixed(2)}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          whiteSpace: 'nowrap',
                          background: status === 'Vencida' ? '#f0f0f0' : status === 'Próxima em 30 dias' ? '#f0f0f0' : '#ffffff',
                          color: status === 'Vencida' ? '#333333' : status === 'Próxima em 30 dias' ? '#333333' : '#000000',
                          border: '1px solid #dddddd'
                        }}>
                          {status === 'Vencida' ? 'Vencida' : status === 'Próxima em 30 dias' ? 'Próximos 30d' : 'Em dia'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function KPICard({ label, value, sub }) {
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '1.5rem', borderTop: '3px solid #333333' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: '#000000', marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#999999' }}>
        {sub}
      </div>
    </div>
  );
}
