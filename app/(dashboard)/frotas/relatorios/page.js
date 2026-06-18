'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

export default function RelatoriosPage() {
  const [gerando, setGerando] = useState(false);

  const relatorios = [
    {
      id: 1,
      titulo: 'Frota Geral',
      descricao: 'Relatório completo de veículos, status e documentação',
      formato: ['PDF', 'Excel']
    },
    {
      id: 2,
      titulo: 'Manutenção Preventiva',
      descricao: 'Histórico e agendamento de manutenções',
      formato: ['PDF', 'Excel']
    },
    {
      id: 3,
      titulo: 'Análise de Custos',
      descricao: 'Combustível, seguros, multas e manutenção',
      formato: ['PDF', 'Excel']
    },
    {
      id: 4,
      titulo: 'Consumo de Combustível',
      descricao: 'Histórico de consumo e custos por veículo',
      formato: ['PDF', 'Excel']
    },
    {
      id: 5,
      titulo: 'Multas e Infrações',
      descricao: 'Registro de todas as multas e status de pagamento',
      formato: ['PDF', 'Excel']
    },
    {
      id: 6,
      titulo: 'Seguros e Coberturas',
      descricao: 'Apólices ativas, vencimentos e valores',
      formato: ['PDF', 'Excel']
    }
  ];

  async function gerarRelatorio(tipo, formato) {
    setGerando(true);
    try {
      // Simula geração de relatório
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert(`Relatório "${tipo}" em ${formato} gerado com sucesso!`);
    } catch (error) {
      alert('Erro ao gerar relatório');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Relatórios" subtitle="Gere relatórios de frotas em PDF ou Excel" />

      {/* Grid de Relatórios */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
        {relatorios.map((rel) => (
          <div key={rel.id} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000', marginBottom: '0.5rem' }}>
              {rel.titulo}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#666666', marginBottom: '1rem', flex: 1 }}>
              {rel.descricao}
            </p>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {rel.formato.map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => gerarRelatorio(rel.titulo, fmt)}
                  disabled={gerando}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#000000',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    cursor: gerando ? 'not-allowed' : 'pointer',
                    opacity: gerando ? 0.6 : 1
                  }}>
                  {gerando ? 'Gerando...' : `Baixar ${fmt}`}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
