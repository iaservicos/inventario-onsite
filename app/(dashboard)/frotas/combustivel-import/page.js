'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function CombustivelImportPage() {
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'text/csv' || selectedFile.type === 'application/vnd.ms-excel') {
        setFile(selectedFile);
        setMessage('');
      } else {
        setMessage('Por favor selecione um arquivo CSV válido');
        setFile(null);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage('Por favor selecione um arquivo');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/frotas/combustivel/import', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setMessage('Arquivo importado com sucesso!');
        setFile(null);
        setTimeout(() => router.push('/frotas/combustivel'), 2000);
      } else {
        setMessage(`Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage(`Erro ao importar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Importar Combustíveis"
      subtitle="Carregue um arquivo CSV com os dados de combustível"
    >

      <form onSubmit={handleSubmit} style={{ marginTop: '3rem' }}>
        {/* Arquivo */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Selecionar Arquivo CSV *
          </label>
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            onChange={handleFileChange}
            style={{
              width: '100%',
              padding: '1rem',
              border: '2px dashed var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          />
          {file && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--color-accent-cyan)', fontWeight: '600' }}>
              Arquivo selecionado: {file.name}
            </div>
          )}
        </div>

        {/* Instruções */}
        <div style={{
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border-light)',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          fontSize: '0.85rem'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--color-accent-cyan)', marginBottom: '1rem' }}>
            Formato esperado do CSV:
          </div>
          <div style={{ color: 'var(--color-text-tertiary)', fontFamily: "'JetBrains Mono'" }}>
            data, placa, motorista, produto, quantidade, valor_unitario, valor_total, consumo, distancia, hodometro, uf, cidade, filial
          </div>
        </div>

        {/* Mensagem */}
        {message && (
          <div style={{
            padding: '1rem',
            marginBottom: '2rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            background: message.includes('sucesso') ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
            color: message.includes('sucesso') ? 'var(--color-accent-cyan)' : 'var(--color-text-tertiary)',
            border: '1px solid var(--color-border-light)'
          }}>
            {message}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading || !file}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: loading || !file ? 'var(--color-text-tertiary)' : 'var(--color-accent-cyan)',
              color: 'var(--color-bg-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: loading || !file ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => !loading && file && (e.target.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)')}
            onMouseOut={(e) => (e.target.style.boxShadow = 'none')}
          >
            {loading ? 'Importando...' : 'Importar Arquivo'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/frotas/combustivel')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: 'var(--color-bg-secondary)',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => (e.target.background = 'var(--color-bg-primary)')}
            onMouseOut={(e) => (e.target.background = 'var(--color-bg-secondary)')}
          >
            Cancelar
          </button>
        </div>
      </form>
    </DashboardLayout>
  );
}
