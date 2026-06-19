'use client';

import PageHeader from '@/components/ui/PageHeader';
import { downloadExcelTemplate } from '@/lib/xlsx-helper';
import CombustvelImportForm from './ImportForm';

export default function CombustvelImportPage() {
  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <PageHeader
          title="Importar Consumo de Combustível"
          subtitle="Importe dados de abastecimentos via arquivo Excel ou CSV"
        />
      </div>

      <div style={{ maxWidth: '800px', marginTop: '2rem' }}>
        {/* Template */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000', marginBottom: '0.5rem' }}>
            Template de Importação
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#666666', marginBottom: '1rem' }}>
            Baixe o template com os campos necessários para importação
          </p>
          <button
            onClick={() => downloadExcelTemplate('template_combustivel.csv')}
            style={{
              padding: '0.6rem 1.2rem',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => (e.target.style.background = '#222222')}
            onMouseOut={e => (e.target.style.background = '#000000')}>
            Baixar Template CSV
          </button>
        </div>

        {/* Form */}
        <CombustvelImportForm />

        {/* Instruções */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e5e5e5',
            borderRadius: '6px',
            padding: '1.5rem',
            marginTop: '1.5rem'
          }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#000000', marginBottom: '0.75rem' }}>
            Estrutura Esperada do Arquivo
          </h4>
          <div
            style={{
              background: '#f9f9f9',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              padding: '1rem',
              fontSize: '0.8rem',
              fontFamily: "'JetBrains Mono', monospace",
              color: '#333333',
              overflowX: 'auto',
              marginBottom: '1rem'
            }}>
            Data | Placa | Motorista | UF | Produto | Litros | Km/L | Hodômetro | Vl.Unit | Vl.Total | Filial
          </div>
          <ul style={{ fontSize: '0.85rem', color: '#666666', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Data:</strong> Formato YYYY-MM-DD (ex: 2026-06-19)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Placa:</strong> Formato ABC-1234
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Motorista:</strong> Nome do condutor
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>UF:</strong> 2 letras maiúsculas (SP, RJ, MG, etc)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Produto:</strong> Gasolina, Diesel, Etanol, Arla 32, GNV
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Litros:</strong> Número decimal
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Km/L:</strong> Eficiência (número decimal)
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Hodômetro:</strong> KM atual do veículo
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Vl.Unit:</strong> Valor unitário do combustível
            </li>
            <li style={{ marginBottom: '0.5rem' }}>
              <strong>Vl.Total:</strong> Valor total do abastecimento
            </li>
            <li>
              <strong>Filial:</strong> Identificação da filial/local
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
