'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import FilterBar from '@/components/ui/FilterBar';

export default function AgendamentosPage() {
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        // Simula agendamentos de manutenção
        const agendamentos = dados.data.map((f, idx) => ({
          id: f.id,
          placa: f.placa,
          modelo: f.modelo,
          dataAgendada: new Date(Date.now() + (idx + 1) * 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          tipo: ['Revisão', 'Troca de óleo', 'Alinhamento'][idx % 3],
          oficina: ['Oficina Central', 'Oficina SP-001', 'Oficina SP-002'][idx % 3],
          status: idx % 3 === 0 ? 'Confirmado' : idx % 3 === 1 ? 'Pendente' : 'Concluído'
        }));
        setAgendamentos(agendamentos.sort((a, b) => new Date(a.dataAgendada) - new Date(b.dataAgendada)));
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

  const filtrados = agendamentos.filter(a =>
    a.placa.toUpperCase().includes(filters.search.toUpperCase()) &&
    (!filters.status || a.status === filters.status)
  );

  const stats = {
    confirmados: agendamentos.filter(a => a.status === 'Confirmado').length,
    pendentes: agendamentos.filter(a => a.status === 'Pendente').length,
    concluidos: agendamentos.filter(a => a.status === 'Concluído').length
  };

  const statusOptions = [
    { value: '', label: 'Todos' },
    { value: 'Confirmado', label: 'Confirmado' },
    { value: 'Pendente', label: 'Pendente' },
    { value: 'Concluído', label: 'Concluído' }
  ];

  const getStatusColor = (status) => {
    const colors = {
      'Confirmado': { bg: 'rgba(5,150,105,.1)', text: '#059669' },
      'Pendente': { bg: 'rgba(217,119,6,.1)', text: '#d97706' },
      'Concluído': { bg: 'rgba(3,105,161,.1)', text: '#0369a1' }
    };
    return colors[status] || { bg: '#f5f5f5', text: '#666' };
  };

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Agendamento de Manutenção" subtitle="Controle de manutenções agendadas" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <KPICard label="Confirmados" value={stats.confirmados} color="#059669" />
        <KPICard label="Pendentes" value={stats.pendentes} color="#d97706" />
        <KPICard label="Concluídos" value={stats.concluidos} color="#0369a1" />
      </div>

      {/* Filtro */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        searchPlaceholder="Buscar por placa..."
        selectOptions={{ status: statusOptions }}
      />

      {/* Tabela */}
      <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e5e7eb', marginTop: '1rem' }}>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Nenhum agendamento encontrado</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Placa</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tipo</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Oficina</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data Agendada</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a) => {
                  const color = getStatusColor(a.status);
                  return (
                    <tr key={a.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '1rem', fontWeight: '700', color: '#0369a1' }}>{a.placa}</td>
                      <td style={{ padding: '1rem', color: '#0f172a' }}>{a.tipo}</td>
                      <td style={{ padding: '1rem', color: '#475569' }}>{a.oficina}</td>
                      <td style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>
                        {new Date(a.dataAgendada).toLocaleDateString('pt-BR')}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '0.25rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: color.bg,
                          color: color.text
                        }}>
                          {a.status}
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

function KPICard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: '900', color }}>
        {value}
      </div>
    </div>
  );
}
