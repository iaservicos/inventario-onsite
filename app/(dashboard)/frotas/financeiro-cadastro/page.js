'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

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
    <DashboardLayout
      title="Cadastrar Despesa"
      subtitle="Adicione multas, manutenções ou outras despesas"
    >

      <form onSubmit={handleSubmit} style={{ marginTop: '3rem' }}>
        {/* Placa */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
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
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Tipo */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Tipo de Despesa *
          </label>
          <select
            name="tipo"
            value={form.tipo}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
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
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
            Data da Despesa
          </label>
          <input
            type="date"
            name="data_despesa"
            value={form.data_despesa}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Descrição */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
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
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Valor */}
        <div style={{ marginBottom: '2rem' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.5rem' }}>
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
              padding: '0.75rem 1rem',
              border: '1px solid var(--color-border-light)',
              borderRadius: '8px',
              fontSize: '0.9rem',
              boxSizing: 'border-box',
              fontFamily: "'JetBrains Mono'"
            }}
          />
        </div>

        {/* Mensagem */}
        {message && (
          <div style={{
            padding: '1rem',
            marginBottom: '2rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            background: message.includes('✓') ? 'var(--color-bg-secondary)' : 'var(--color-bg-secondary)',
            color: message.includes('✓') ? 'var(--color-accent-cyan)' : 'var(--color-text-tertiary)',
            border: `1px solid var(--color-border-light)`
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
              background: loading ? 'var(--color-text-tertiary)' : 'var(--color-accent-cyan)',
              color: 'var(--color-bg-primary)',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.9rem',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseOver={(e) => !loading && (e.target.style.boxShadow = '0 0 15px rgba(0, 212, 255, 0.4)')}
            onMouseOut={(e) => (e.target.style.boxShadow = 'none')}
          >
            {loading ? 'Salvando...' : 'Salvar Despesa'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/frotas/financeiro')}
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


