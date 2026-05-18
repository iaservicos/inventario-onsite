'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

const DIAS_SEMANA = [
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
];

export default function GestaoEscalonamentoPage() {
  const { data: session, status } = useSession();
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null); // ID do técnico salvando
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/technicians?active=true');
      const data = await res.json();
      setTecnicos(Array.isArray(data) ? data : []);
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao carregar técnicos' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const updateRoutine = async (techId, field, value) => {
    setSaving(techId);
    try {
      const res = await fetch(`/api/technicians/${techId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        setTecnicos(prev => prev.map(t => t.id === techId ? { ...t, [field]: value } : t));
        setMsg({ type: 'success', text: 'Configuração salva!' });
        setTimeout(() => setMsg({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao salvar' });
    }
    setSaving(null);
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Carregando Painel de Gestão...</div>;
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div style={{ padding: '2rem' }}>
      <PageHeader
        title="Gestão de Escalonamento"
        subtitle={isAdmin ? "Planejamento semanal de todos os técnicos" : `Planejamento dos técnicos sob gestão de ${session?.user?.name}`}
      />

      {msg.text && (
        <div style={{
          position: 'fixed', top: '2rem', right: '2rem', padding: '1rem 1.5rem',
          background: msg.type === 'error' ? '#000000' : '#ffffff',
          color: msg.type === 'error' ? '#ffffff' : '#000000',
          border: '2px solid #000000', borderRadius: '8px', fontWeight: '800', zIndex: 1000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000' }}>
        <div style={{ padding: '1.5rem', background: '#f4f4f5', borderBottom: '2px solid #000000' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Cronograma de Inventário Parcial
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000000' }}>
                <th style={thStyle}>Técnico</th>
                <th style={thStyle}>Região</th>
                <th style={thStyle}>Dia da Semana (Seg a Sex)</th>
                <th style={thStyle}>Horário de Disparo</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', fontWeight: '700' }}>Nenhum técnico sob sua gestão.</td></tr>
              ) : (
                tecnicos.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e4e4e7', background: saving === t.id ? '#fafafa' : 'transparent' }}>
                    <td style={{ ...tdStyle, fontWeight: '800', color: '#000000' }}>{t.name}</td>
                    <td style={tdStyle}><span style={{ padding: '2px 8px', background: '#f4f4f5', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700' }}>{t.region || '—'}</span></td>
                    <td style={tdStyle}>
                      <select
                        value={t.inventory_day || ''}
                        onChange={(e) => updateRoutine(t.id, 'inventory_day', e.target.value ? Number(e.target.value) : null)}
                        style={selectStyle}
                      >
                        <option value="">Não Definido</option>
                        {DIAS_SEMANA.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="time"
                        value={t.inventory_time || '09:00'}
                        onChange={(e) => updateRoutine(t.id, 'inventory_time', e.target.value)}
                        style={selectStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      {t.inventory_day ? (
                        <span style={{ color: '#000000', fontWeight: '800', fontSize: '0.75rem' }}>✓ AGENDADO</span>
                      ) : (
                        <span style={{ color: '#a1a1aa', fontWeight: '600', fontSize: '0.75rem' }}>⚠ PENDENTE</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ffffff', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: '800', color: '#000000', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Como funciona:</div>
        <p style={{ fontSize: '0.85rem', color: '#52525b', lineHeight: '1.5' }}>
          O sistema utiliza este planejamento para disparar automaticamente o inventário parcial de 10 peças. 
          O disparo ocorrerá no dia e horário configurados acima. Caso um técnico não tenha dia definido, 
          o inventário não será disparado automaticamente.
        </p>
      </div>
    </div>
  );
}

const thStyle = { padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase', background: '#ffffff' };
const tdStyle = { padding: '1rem', fontSize: '0.875rem', color: '#000000' };
const selectStyle = {
  width: '100%', padding: '0.5rem', border: '1px solid #000000', borderRadius: '4px',
  fontSize: '0.85rem', fontWeight: '700', background: '#ffffff', color: '#000000', cursor: 'pointer'
};
