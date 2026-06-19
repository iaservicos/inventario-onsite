'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

export default function FinanceiroCadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    placa: '',
    tipo: 'multa',
    descricao: '',
    valor: '',
    data_despesa: new Date().toISOString().split('T')[0]
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.placa || !form.valor) {
      setMessage('⚠️ Placa e Valor são obrigatórios');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/frotas/despesas/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });

      const data = await res.json();

      if (data.success) {
        setMessage('✓ Despesa cadastrada com sucesso!');
        setForm({
          placa: '',
          tipo: 'multa',
          descricao: '',
          valor: '',
          data_despesa: new Date().toISOString().split('T')[0]
        });
        setTimeout(() => router.push('/frotas/financeiro'), 1500);
      } else {
        setMessage(`✗ Erro: ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Erro ao salvar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '600px', margin: '0 auto' }}>
      <PageHeader
        title="Cadastrar Despesa"
        subtitle="Adicione multas, manutenções ou outras despesas"
      />

      <form onSubmit={handleSubmit} style={{ marginTop: '2rem' }}>
        {/* Placa */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#333333', marginBottom: '0.5rem' }}>
            Placa do Veículo *
          </label>
          <input
            type="text"
            name="placa"
            value={form.placa}
            onChange={handleChange}
            placeholder="ABC-1234"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#333333', marginBottom: '0.5rem' }}>
            Tipo de Despesa *
          </label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          >
            <option value="multa">Multa</option>
            <option value="manutencao">Manutenção</option>
            <option value="outro">Outra Despesa</option>
          </select>
        </div>

        {/* Data */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#333333', marginBottom: '0.5rem' }}>
            Data da Despesa
          </label>
          <input
            type="date"
            name="data_despesa"
            value={form.data_despesa}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#333333', marginBottom: '0.5rem' }}>
            Descrição
          </label>
          <textarea
            name="descricao"
            value={form.descricao}
            onChange={handleChange}
            placeholder="Ex: Multa por excesso de velocidade"
            rows="3"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Valor */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#333333', marginBottom: '0.5rem' }}>
            Valor (R$) *
          </label>
          <input
            type="number"
            name="valor"
            value={form.valor}
            onChange={handleChange}
            placeholder="0.00"
            step="0.01"
            min="0"
            style={{
              width: '100%',
              padding: '0.75rem',
              border: '1px solid #e5e5e5',
              borderRadius: '4px',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              fontFamily: "'JetBrains Mono'"
            }}
          />
        </div>

        {/* Mensagem */}
        {message && (
          <div style={{
            padding: '0.75rem',
            marginBottom: '1rem',
            borderRadius: '4px',
            fontSize: '0.9rem',
            background: message.includes('✓') ? '#f0f9ff' : '#fef2f2',
            color: message.includes('✓') ? '#0369a1' : '#dc2626',
            border: `1px solid ${message.includes('✓') ? '#bfdbfe' : '#fecaca'}`
          }}>
            {message}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            type="submit"
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: loading ? '#cccccc' : '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Salvando...' : 'Salvar Despesa'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/frotas/financeiro')}
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              background: '#f0f0f0',
              color: '#333333',
              border: '1px solid #dddddd',
              borderRadius: '4px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
