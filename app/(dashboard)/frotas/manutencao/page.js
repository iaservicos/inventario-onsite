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
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setManutencoes([]);
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
    m.placa.toUpperCase().includes(filters.search.toUpperCase()) &&
    (!filters.tipo || m.tipo === filters.tipo)
  );

  const kpis = {
    vencidas: filtrados.filter(m => m.status === 'Vencida').length,
    proximos30: filtrados.filter(m => m.status === 'Próxima em 30 dias').length,
    emDia: filtrados.filter(m => m.status === 'Em dia').length
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
      <PageHeader title="Manutenções" subtitle="Histórico e programação de manutenções dos veículos" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem', marginTop: '1.5rem' }}>
        <KPICard label="Vencidas" value={kpis.vencidas} color="red" sub="Atenção imediata" />
        <KPICard label="Próx. 30 dias" value={kpis.proximos30} color="amber" sub="Agendar" />
        <KPICard label="Em dia" value={kpis.emDia} color="green" sub="Ok" />
      </div>

      {/* Filtro */}
      <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1rem', marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar por placa..."
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          style={{ flex: 1, minWidth: '160px', padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem' }}
        />
        <select
          value={filters.tipo}
          onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.9rem', minWidth: '160px' }}
        >
          {tipoOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div style={{ background: '#ffffff', borderRadius: '6px', overflow: 'hidden', border: '1px solid #eeeeee', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666666' }}>Nenhuma manutenção encontrada</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee', background: '#ffffff' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Modelo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Realiz.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Próxima Prev.</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Km</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Valor (R$)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: '600', color: '#333333' }}>{m.placa}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.modelo}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666' }}>{m.tipo}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(m.dataRealizacao).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontSize: '0.9rem' }}>
                      {new Date(m.proximaPreventiva).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      {m.km}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      R$ {parseFloat(m.valor).toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <StatusBadge status={m.status} />
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

function KPICard({ label, value, color, sub }) {
  const colorMap = {
    red: '#dc2626',
    amber: '#d97706',
    green: '#059669'
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.5rem', borderTop: `3px solid ${colorMap[color]}` }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color: colorMap[color], marginBottom: '0.5rem' }}>
        {value}
      </div>
      <div style={{ fontSize: '0.75rem', color: '#999999' }}>
        {sub}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const statusStyles = {
    'Vencida': { bg: '#fee2e2', color: '#dc2626', text: 'Vencida' },
    'Próxima em 30 dias': { bg: '#fef3c7', color: '#d97706', text: 'Próximos 30d' },
    'Em dia': { bg: '#d1fae5', color: '#059669', text: 'Em dia' }
  };

  const style = statusStyles[status] || statusStyles['Em dia'];

  return (
    <span style={{ background: style.bg, color: style.color, padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
      {style.text}
    </span>
  );
}
