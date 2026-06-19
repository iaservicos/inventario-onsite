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
        const tipos = ['Multa', 'Manutenção'];
        const despesas = dados.data.flatMap((f, idx) =>
          Array.from({ length: 3 }, (_, i) => ({
            id: `${f.id}-desp${i}`,
            data: new Date(Date.now() - i * 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            placa: f.placa,
            modelo: f.modelo,
            tipo: tipos[i % tipos.length],
            descricao: tipos[i % tipos.length] === 'Multa' ? 'Multa de trânsito' : 'Revisão preventiva',
            valor: (100 + Math.random() * 500).toFixed(2)
          }))
        );
        setDespesas(despesas.sort((a, b) => new Date(b.data) - new Date(a.data)));
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
    totalMultas: despesas
      .filter(d => d.tipo === 'Multa')
      .reduce((acc, d) => acc + parseFloat(d.valor), 0)
      .toFixed(2),
    totalManutencoes: despesas
      .filter(d => d.tipo === 'Manutenção')
      .reduce((acc, d) => acc + parseFloat(d.valor), 0)
      .toFixed(2),
    totalGeral: despesas.reduce((acc, d) => acc + parseFloat(d.valor), 0).toFixed(2),
    mediaVeiculo: (despesas.reduce((acc, d) => acc + parseFloat(d.valor), 0) / Math.max(1, new Set(despesas.map(d => d.placa)).size)).toFixed(2)
  };

  const rankingVeiculos = Array.from(
    new Map(
      despesas.map(d => [
        d.placa,
        {
          placa: d.placa,
          modelo: d.modelo,
          multas: despesas.filter(x => x.placa === d.placa && x.tipo === 'Multa').reduce((acc, x) => acc + parseFloat(x.valor), 0),
          manutencoes: despesas.filter(x => x.placa === d.placa && x.tipo === 'Manutenção').reduce((acc, x) => acc + parseFloat(x.valor), 0)
        }
      ])
    ).values()
  )
    .map(v => ({ ...v, total: v.multas + v.manutencoes }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const rankingTecnicos = [
    { tecnico: 'João Silva', atp: 'ABC-1234', qtd: 3, valor: 450.00 },
    { tecnico: 'Maria Santos', atp: 'XYZ-5678', qtd: 2, valor: 320.00 },
    { tecnico: 'Pedro Oliveira', atp: 'DEF-9012', qtd: 1, valor: 150.00 }
  ].sort((a, b) => b.valor - a.valor);

  const rankingOcorrencias = rankingVeiculos.map((v, i) => ({
    ...v,
    acidentes: Math.floor(Math.random() * 3),
    multas_qtd: Math.floor(Math.random() * 5),
    danos: Math.floor(Math.random() * 2)
  }));

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
                        background: d.tipo === 'Multa' ? '#fee2e2' : '#fef3c7',
                        color: d.tipo === 'Multa' ? '#991b1b' : '#b45309'
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
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, color }) {
  const colorMap = {
    red: '#dc2626',
    amber: '#d97706',
    blue: '#0369a1',
    green: '#059669'
  };

  return (
    <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px', padding: '1.25rem', borderTop: `3px solid ${colorMap[color]}` }}>
      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#999999', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.75rem', fontWeight: '900', color: colorMap[color] }}>
        {value}
      </div>
    </div>
  );
}
