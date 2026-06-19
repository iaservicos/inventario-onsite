'use client';

import { useState, useEffect, useCallback } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function FinanceiroPage() {
  const [filters, setFilters] = useState({ tipo: '' });
  const [despesas, setDespesas] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/frotas', { cache: 'no-store' });
      const dados = await res.json();
      if (dados.success) {
        setDespesas([]);
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

  const filtrados = despesas.filter(d =>
    !filters.tipo || d.tipo === filters.tipo
  );

  const kpis = {
    totalMultas: '0.00',
    totalManutencoes: '0.00',
    totalGeral: '0.00',
    mediaVeiculo: '0.00'
  };

  const rankingVeiculos = [];

  const rankingTecnicos = [];

  const rankingOcorrencias = [];

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Financeiro" subtitle="Análise de custos por veículo e técnico" />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem', marginTop: '1.5rem' }}>
        <KPICard label="Total Multas" value={`R$ ${kpis.totalMultas}`} color="red" />
        <KPICard label="Total Manutenções" value={`R$ ${kpis.totalManutencoes}`} color="amber" />
        <KPICard label="Total Geral" value={`R$ ${kpis.totalGeral}`} color="blue" />
        <KPICard label="Média por Veículo" value={`R$ ${kpis.mediaVeiculo}`} color="green" />
      </div>

      {/* Ranking Veículos e Técnicos */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Veículos com Maior Custo */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #eeeeee' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000' }}>
              Veículos com Maior Custo
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Placa</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Modelo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Multas</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Manut.</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rankingVeiculos.map((v) => (
                  <tr key={v.placa} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333333' }}>{v.placa}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{v.modelo}</td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      R$ {v.multas.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontFamily: "'JetBrains Mono'" }}>
                      R$ {v.manutencoes.toFixed(2)}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                      R$ {v.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankingVeiculos.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.85rem' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Técnicos com Mais Multas */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #eeeeee' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000' }}>
              Técnicos com Mais Multas
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Técnico</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>ATP</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Qtd</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {rankingTecnicos.map((t, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333333' }}>{t.tecnico}</td>
                    <td style={{ padding: '0.75rem', color: '#666666', fontSize: '0.8rem', fontFamily: "'JetBrains Mono'" }}>
                      {t.atp}
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{t.qtd}</td>
                    <td style={{ padding: '0.75rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                      R$ {t.valor.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankingTecnicos.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.85rem' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ocorrências e Últimas Despesas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Veículos com Mais Ocorrências */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #eeeeee' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000' }}>
              Veículos com Mais Ocorrências
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Placa</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Modelo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Acidentes</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Multas</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Danos</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rankingOcorrencias.map((o) => (
                  <tr key={o.placa} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333333' }}>{o.placa}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{o.modelo}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{o.acidentes}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{o.multas_qtd}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{o.danos}</td>
                    <td style={{ padding: '0.75rem', color: '#000000', fontWeight: '600' }}>
                      {o.acidentes + o.multas_qtd + o.danos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rankingOcorrencias.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.85rem' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>

        {/* Últimas Despesas */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid #eeeeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000' }}>
              Últimas Despesas
            </div>
            <select
              value={filters.tipo}
              onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              style={{ padding: '0.4rem 0.6rem', border: '1px solid #eeeeee', borderRadius: '4px', fontSize: '0.85rem' }}
            >
              <option value="">Tudo</option>
              <option value="Multa">Multas</option>
              <option value="Manutenção">Manutenções</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eeeeee' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Data</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Placa</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Tipo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Descrição</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '800', color: '#000000', textTransform: 'uppercase' }}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.slice(0, 5).map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '0.75rem', color: '#666666', fontSize: '0.8rem' }}>
                      {new Date(d.data).toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: '600', color: '#333333' }}>{d.placa}</td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '3px',
                        fontSize: '0.7rem',
                        fontWeight: '600',
                        background: '#f0f0f0',
                        color: '#333333',
                        border: '1px solid #dddddd'
                      }}>
                        {d.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', color: '#666666' }}>{d.descricao}</td>
                    <td style={{ padding: '0.75rem', color: '#000000', fontWeight: '600', fontFamily: "'JetBrains Mono'" }}>
                      R$ {parseFloat(d.valor).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtrados.length === 0 && (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#999999', fontSize: '0.85rem' }}>
                Nenhum dado disponível
              </div>
            )}
          </div>
        </div>
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
