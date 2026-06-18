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
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader title="Importar Frotas" subtitle="Importe dados de veículos via arquivo CSV" />

      <div style={{ maxWidth: '600px', marginTop: '2rem' }}>
        {/* Template */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000', marginBottom: '0.75rem' }}>
            Template de Importação
          </h3>
          <p style={{ fontSize: '0.85rem', color: '#666666', marginBottom: '1rem' }}>
            Baixe o template em CSV com os campos necessários
          </p>
          <button
            onClick={downloadTemplate}
            style={{
              padding: '0.5rem 1rem',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              fontSize: '0.75rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}>
            Baixar Template CSV
          </button>
        </div>

        {/* Upload */}
        <form onSubmit={handleImport} style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000', marginBottom: '0.75rem' }}>
            Selecione o Arquivo
          </h3>

          <div style={{
            border: '2px dashed #cccccc',
            borderRadius: '6px',
            padding: '2rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: '#f9f9f9'
          }}>
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => setArquivo(e.target.files?.[0] || null)}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #e0e0e0',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            />
            {arquivo && (
              <p style={{ fontSize: '0.85rem', color: '#666666', marginTop: '0.5rem' }}>
                Arquivo: <strong>{arquivo.name}</strong>
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!arquivo || importando}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: !arquivo || importando ? '#cccccc' : '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '3px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: !arquivo || importando ? 'not-allowed' : 'pointer'
            }}>
            {importando ? 'Importando...' : 'Importar'}
          </button>
        </form>

        {/* Resultado */}
        {resultado && (
          <div style={{
            background: resultado.sucesso ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${resultado.sucesso ? '#86efac' : '#fca5a5'}`,
            borderRadius: '6px',
            padding: '1.5rem',
            marginTop: '1.5rem'
          }}>
            <h4 style={{
              fontSize: '0.9rem',
              fontWeight: '700',
              color: resultado.sucesso ? '#16a34a' : '#dc2626',
              marginBottom: '0.5rem'
            }}>
              {resultado.sucesso ? '✓ Sucesso!' : '✗ Erro'}
            </h4>
            <p style={{ fontSize: '0.85rem', color: '#333333' }}>
              {resultado.message}
            </p>
            {resultado.sucesso && (
              <p style={{ fontSize: '0.8rem', color: '#666666', marginTop: '0.5rem' }}>
                Total de veículos no sistema: <strong>{resultado.total}</strong>
              </p>
            )}
          </div>
        )}

        {/* Instruções */}
        <div style={{ background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '6px', padding: '1.5rem', marginTop: '1.5rem' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#000000', marginBottom: '0.75rem' }}>
            Instruções
          </h4>
          <ul style={{ fontSize: '0.85rem', color: '#666666', listStyle: 'none', padding: 0 }}>
            <li style={{ marginBottom: '0.5rem' }}>1. Baixe o template CSV</li>
            <li style={{ marginBottom: '0.5rem' }}>2. Preenchaa com seus dados de veículos</li>
            <li style={{ marginBottom: '0.5rem' }}>3. Campos obrigatórios: placa e modelo</li>
            <li style={{ marginBottom: '0.5rem' }}>4. Selecione o arquivo e clique em Importar</li>
            <li>5. Os dados serão adicionados ao sistema</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
