'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';

export default function FrotasImportPage() {
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [resultado, setResultado] = useState(null);

  async function handleImport(e) {
    e.preventDefault();
    if (!arquivo) {
      toast.error('Selecione um arquivo');
      return;
    }

    setImportando(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const text = event.target.result;
          const linhas = text.split('\n').slice(1).filter(l => l.trim());

          const dados = linhas.map(linha => {
            const partes = linha.split(',').map(p => p.trim());
            return {
              placa: partes[0],
              modelo: partes[1],
              marca: partes[2],
              ano: partes[3],
              kmAtual: partes[4],
              status: partes[5] || 'Ativo',
              combustivel: partes[6] || '0',
              observacoes: partes[7] || ''
            };
          });

          const res = await fetch('/api/frotas/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'import', data: dados })
          });

          const result = await res.json();

          if (result.success) {
            setResultado({
              sucesso: true,
              importados: result.imported,
              total: result.total,
              message: `${result.imported} veículos importados com sucesso!`
            });
            toast.success(`${result.imported} veículos importados!`);
            setArquivo(null);
          } else {
            setResultado({
              sucesso: false,
              message: result.error || 'Erro ao importar'
            });
            toast.error(result.error || 'Erro ao importar');
          }
        } catch (error) {
          console.error('Erro:', error);
          toast.error('Erro ao processar arquivo');
        } finally {
          setImportando(false);
        }
      };
      reader.readAsText(arquivo);
    } catch (error) {
      console.error('Erro:', error);
      setImportando(false);
      toast.error('Erro ao importar');
    }
  }

  async function downloadTemplate() {
    const header = 'placa,modelo,marca,ano,kmAtual,status,combustivel,observacoes\n';
    const exemplo = 'ABC-1234,Ford Transit,Ford,2022,42000,Ativo,50,Veículo em bom estado\n';
    const exemplo2 = 'XYZ-5678,Iveco Daily,Iveco,2021,62000,Parado,30,Em manutenção\n';

    const csv = header + exemplo + exemplo2;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_frotas.csv';
    a.click();
  }

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%', background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <PageHeader title="Importar Frotas" subtitle="Importe dados de veículos via arquivo CSV" />

      <div style={{ maxWidth: '600px', marginTop: '2rem' }}>
        {/* Template */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Template de Importação
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            Baixe o template em CSV com os campos necessários
          </p>
          <button
            onClick={downloadTemplate}
            style={{
              padding: '0.5rem 1rem',
              background: 'var(--color-accent-cyan)',
              color: '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
            Baixar Template CSV
          </button>
        </div>

        {/* Upload */}
        <form onSubmit={handleImport} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', marginBottom: '2rem', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Selecione o Arquivo
          </h3>

          <div style={{
            border: '2px dashed var(--color-border-light)',
            borderRadius: '8px',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '2rem',
            background: 'var(--color-bg-primary)',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid var(--color-border-light)',
                borderRadius: '8px',
                cursor: 'pointer',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit'
              }}
            />
            {arquivo && (
              <p style={{ fontSize: '0.9rem', color: 'var(--color-accent-cyan)', marginTop: '0.75rem', fontWeight: '600' }}>
                ✓ Arquivo: <strong>{arquivo.name}</strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!arquivo || importando}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: !arquivo || importando ? '#333' : 'var(--color-accent-cyan)',
              color: !arquivo || importando ? '#666' : '#000',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '800',
              cursor: !arquivo || importando ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}
            onMouseEnter={(e) => { if (!(!arquivo || importando)) e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </form>

        {/* Resultado */}
        {resultado && (
          <div style={{
            background: resultado.sucesso ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
            border: `1px solid ${resultado.sucesso ? 'var(--color-success)' : 'var(--color-error)'}`,
            borderRadius: '12px',
            padding: '2rem',
            marginBottom: '2rem'
          }}>
            <h4 style={{
              fontSize: '0.95rem',
              fontWeight: '800',
              color: resultado.sucesso ? 'var(--color-success)' : 'var(--color-error)',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {resultado.sucesso ? '✓ Sucesso!' : '✗ Erro'}
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              {resultado.message}
            </p>
            {resultado.sucesso && (
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '0.75rem' }}>
                Total de veículos no sistema: <strong style={{ color: 'var(--color-accent-cyan)' }}>{resultado.total}</strong>
              </p>
            )}
          </div>
        )}

        {/* Instruções */}
        <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '2rem', transition: 'all 0.3s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--color-text-primary)', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Instruções
          </h4>
          <ul style={{ fontSize: '0.9rem', color: 'var(--color-text-tertiary)', listStyle: 'none', padding: 0, lineHeight: '1.8' }}>
            <li style={{ marginBottom: '0.75rem' }}>1. Baixe o template CSV</li>
            <li style={{ marginBottom: '0.75rem' }}>2. Preenchaa com seus dados de veículos</li>
            <li style={{ marginBottom: '0.75rem' }}>3. Campos obrigatórios: placa e modelo</li>
            <li style={{ marginBottom: '0.75rem' }}>4. Selecione o arquivo e clique em Importar</li>
            <li>5. Os dados serão adicionados ao sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
