'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';

export default function CombustvelImportForm() {
  const [arquivo, setArquivo] = useState(null);
  const [importando, setImportando] = useState(false);
  const [preview, setPreview] = useState(null);
  const [resultado, setResultado] = useState(null);
  const [errosDetalhados, setErrosDetalhados] = useState(null);
  const fileInputRef = useRef(null);

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setPreview(null);
    setErrosDetalhados(null);

    // Apenas mostrar que arquivo foi selecionado, sem preview
    setPreview({
      nomeArquivo: file.name,
      totalLinhas: '?',
      previewLinhas: [['Arquivo selecionado. Clique em Confirmar para processar.']]
    });

    toast.success('Arquivo selecionado: ' + file.name);
  }

  async function handleAnalyze() {
    if (!arquivo) {
      toast.error('Selecione um arquivo');
      return;
    }

    setImportando(true);

    try {
      const formData = new FormData();
      formData.append('file', arquivo);

      const res = await fetch('/api/frotas/combustivel/analyze', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        console.log('Estrutura do Excel:', data);
        alert(`
ESTRUTURA DO EXCEL:
─────────────────────────────────
Separador: ${data.structure.separator}
Total de colunas: ${data.structure.totalHeaders}
Total de linhas: ${data.structure.totalDataLines}

COLUNAS ENCONTRADAS:
${data.structure.headers.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}

AMOSTRA DE DADOS (primeiras 3 linhas):
${data.sampleData.slice(0, 3).map((row, i) => `
Linha ${i + 1}:
${Object.entries(row).map(([k, v]) => `  ${k}: ${v}`).join('\n')}
`).join('\n')}
        `);
        toast.success('Estrutura analisada');
      } else {
        toast.error('Erro: ' + data.error);
      }
    } catch (error) {
      console.error('Erro:', error);
      toast.error('Erro ao analisar: ' + error.message);
    } finally {
      setImportando(false);
    }
  }

  async function handleImport() {
    if (!arquivo) {
      toast.error('Selecione um arquivo');
      return;
    }

    setImportando(true);
    setResultado(null);
    setErrosDetalhados(null);

    try {
      const formData = new FormData();
      formData.append('file', arquivo);

      const res = await fetch('/api/frotas/combustivel/import-simple', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setResultado({
          sucesso: true,
          importados: data.imported,
          total: data.total,
          falhados: data.failed,
          message: data.message
        });
        toast.success(`${data.imported} registros importados com sucesso!`);
        setArquivo(null);
        setPreview(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        setResultado({
          sucesso: false,
          message: data.error || 'Erro ao importar',
          importados: data.imported || 0,
          total: data.total || 0,
          falhados: data.failed || 0
        });

        if (data.details?.errors && data.details.errors.length > 0) {
          setErrosDetalhados(data.details.errors.slice(0, 10));
        }

        toast.error(data.error || 'Erro ao importar');
      }
    } catch (error) {
      console.error('Erro:', error);
      setResultado({
        sucesso: false,
        message: 'Erro ao processar importação: ' + error.message,
        importados: 0,
        total: 0,
        falhados: 0
      });
      toast.error('Erro ao processar importação');
    } finally {
      setImportando(false);
    }
  }

  return (
    <div style={{ maxWidth: '800px', marginTop: '2rem' }}>
      {/* Upload */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e5e5',
          borderRadius: '6px',
          padding: '1.5rem',
          marginBottom: '1.5rem'
        }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#000000', marginBottom: '1rem' }}>
          Selecione o Arquivo
        </h3>

        <div
          style={{
            border: '2px dashed #cccccc',
            borderRadius: '6px',
            padding: '2.5rem 1rem',
            textAlign: 'center',
            background: '#fafafa',
            marginBottom: '1.5rem',
            transition: 'all 0.2s'
          }}
          onDragOver={e => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#000000';
            e.currentTarget.style.background = '#f0f0f0';
          }}
          onDragLeave={e => {
            e.currentTarget.style.borderColor = '#cccccc';
            e.currentTarget.style.background = '#fafafa';
          }}
          onDrop={e => {
            e.preventDefault();
            e.currentTarget.style.borderColor = '#cccccc';
            e.currentTarget.style.background = '#fafafa';
            const files = e.dataTransfer.files;
            if (files.length > 0) {
              fileInputRef.current.files = files;
              handleFileSelect({ target: { files } });
            }
          }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv,.json"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{ cursor: 'pointer', userSelect: 'none' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
            <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#000000', marginBottom: '0.25rem' }}>
              Clique para selecionar ou arraste o arquivo
            </div>
            <div style={{ fontSize: '0.85rem', color: '#999999' }}>
              Aceitos: .xlsx, .xls, .csv, .json
            </div>
            {arquivo && (
              <div style={{ fontSize: '0.85rem', color: '#666666', marginTop: '0.75rem', fontWeight: '600' }}>
                ✓ {arquivo.name}
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        {preview && (
          <div
            style={{
              background: '#f9f9f9',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              padding: '1rem',
              marginBottom: '1.5rem',
              fontSize: '0.85rem'
            }}>
            <div style={{ fontWeight: '700', color: '#000000', marginBottom: '0.5rem' }}>
              Preview - {preview.totalLinhas} registros
            </div>
            <div style={{ color: '#666666', marginBottom: '0.75rem' }}>
              Primeiras linhas do arquivo:
            </div>
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e5e5e5',
                borderRadius: '3px',
                padding: '0.75rem',
                overflowX: 'auto',
                fontSize: '0.75rem',
                fontFamily: "'JetBrains Mono', monospace",
                color: '#333333',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
              {preview.previewLinhas
                .map((linha, i) => {
                  if (Array.isArray(linha)) {
                    return linha.join(' | ');
                  }
                  return typeof linha === 'string' ? linha : JSON.stringify(linha);
                })
                .join('\n')}
            </div>
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <button
            onClick={handleAnalyze}
            disabled={!arquivo || importando}
            style={{
              padding: '0.75rem',
              background: !arquivo || importando ? '#cccccc' : '#666666',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: !arquivo || importando ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              if (arquivo && !importando) {
                e.target.style.background = '#888888';
              }
            }}
            onMouseOut={e => {
              if (arquivo && !importando) {
                e.target.style.background = '#666666';
              }
            }}>
            {importando ? 'Analisando...' : 'Analisar Estrutura'}
          </button>

          <button
            onClick={handleImport}
            disabled={!arquivo || importando}
            style={{
              padding: '0.75rem',
              background: !arquivo || importando ? '#cccccc' : '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '700',
              cursor: !arquivo || importando ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseOver={e => {
              if (arquivo && !importando) {
                e.target.style.background = '#222222';
              }
            }}
            onMouseOut={e => {
              if (arquivo && !importando) {
                e.target.style.background = '#000000';
              }
            }}>
            {importando ? 'Importando...' : 'Confirmar Importação'}
          </button>
        </div>
      </div>

      {/* Resultado */}
      {resultado && (
        <div
          style={{
            background: resultado.sucesso ? '#f0fdf4' : '#fef2f2',
            border: `1px solid ${resultado.sucesso ? '#d1e7dd' : '#f8d7da'}`,
            borderRadius: '6px',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
          <h4
            style={{
              fontSize: '0.95rem',
              fontWeight: '700',
              color: resultado.sucesso ? '#155724' : '#721c24',
              marginBottom: '0.75rem'
            }}>
            {resultado.sucesso ? '✓ Sucesso na Importação!' : '✗ Erro na Importação'}
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#333333', marginBottom: '0.5rem' }}>
            {resultado.message}
          </p>
          <div
            style={{
              fontSize: '0.85rem',
              color: '#666666',
              marginTop: '0.75rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '0.5rem'
            }}>
            <div style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '3px' }}>
              <div style={{ fontSize: '0.7rem', color: '#999999', fontWeight: '700' }}>IMPORTADOS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#000000' }}>
                {resultado.importados}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '3px' }}>
              <div style={{ fontSize: '0.7rem', color: '#999999', fontWeight: '700' }}>TOTAL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#000000' }}>
                {resultado.total}
              </div>
            </div>
            <div style={{ padding: '0.5rem', background: '#ffffff', borderRadius: '3px' }}>
              <div style={{ fontSize: '0.7rem', color: '#999999', fontWeight: '700' }}>FALHADOS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: '900', color: '#d32f2f' }}>
                {resultado.falhados}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Erros Detalhados */}
      {errosDetalhados && errosDetalhados.length > 0 && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #f8d7da',
            borderRadius: '6px',
            padding: '1.5rem'
          }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#721c24', marginBottom: '1rem' }}>
            Erros Encontrados ({errosDetalhados.length})
          </h4>
          <div
            style={{
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
            {errosDetalhados.map((erro, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid #f8d7da',
                  borderRadius: '3px',
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  fontSize: '0.85rem'
                }}>
                <div style={{ fontWeight: '700', color: '#721c24', marginBottom: '0.25rem' }}>
                  Linha {erro.rowIndex} - Placa: {erro.record?.placa || 'N/A'}
                </div>
                <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem', color: '#666666' }}>
                  {erro.errors?.map((err, i) => (
                    <li key={i} style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
