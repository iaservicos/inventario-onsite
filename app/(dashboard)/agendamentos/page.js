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
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [hasChanges, setHasChanges] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/technicians?active=true');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTecnicos(list);
      setOriginalData(JSON.parse(JSON.stringify(list)));
      setHasChanges(false);
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao carregar técnicos' });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (status === 'authenticated') load();
  }, [status, load]);

  const handleChange = (techId, field, value) => {
    setTecnicos(prev => {
      const newList = prev.map(t => t.id === techId ? { ...t, [field]: value } : t);
      const changed = JSON.stringify(newList) !== JSON.stringify(originalData);
      setHasChanges(changed);
      return newList;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    setMsg({ type: '', text: '' });
    
    try {
      const changes = tecnicos.filter((t, index) => {
        return JSON.stringify(t) !== JSON.stringify(originalData[index]);
      });

      if (changes.length === 0) {
        setMsg({ type: 'info', text: 'Nenhuma alteração para salvar.' });
        setSaving(false);
        return;
      }

      const promises = changes.map(t => 
        fetch(`/api/technicians/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inventory_day: t.inventory_day,
            inventory_time: t.inventory_time
          }),
        })
      );

      const results = await Promise.all(promises);
      const allOk = results.every(r => r.ok);

      if (allOk) {
        setMsg({ type: 'success', text: `PLANEJAMENTO DE ${changes.length} TECNICO(S) SALVO COM SUCESSO` });
        setOriginalData(JSON.parse(JSON.stringify(tecnicos)));
        setHasChanges(false);
      } else {
        setMsg({ type: 'error', text: 'ERRO AO SALVAR ALTERACOES' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'ERRO DE CONEXAO' });
    }
    setSaving(false);
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>CARREGANDO PAINEL DE GESTAO</div>;
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div style={{ padding: '2rem' }}>
      <PageHeader
        title="GESTAO DE ESCALONAMENTO"
        subtitle={isAdmin ? "PLANEJAMENTO SEMANAL DE TODOS OS TECNICOS" : `PLANEJAMENTO DOS TECNICOS SOB GESTAO DE ${session?.user?.name?.toUpperCase()}`}
        action={
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges || saving}
            style={{
              background: hasChanges ? '#000000' : '#f4f4f5',
              color: hasChanges ? '#ffffff' : '#a1a1aa',
              border: hasChanges ? 'none' : '1px solid #e4e4e7',
              fontWeight: '800',
              padding: '0.6rem 1.5rem',
              borderRadius: '6px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            {saving ? 'SALVANDO...' : 'SALVAR PLANEJAMENTO'}
          </button>
        }
      />

      {msg.text && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem 1.5rem',
          background: msg.type === 'error' ? '#fafafa' : '#ffffff',
          color: '#000000',
          border: `2px solid ${msg.type === 'error' ? '#e4e4e7' : '#000000'}`, 
          borderRadius: '8px', fontWeight: '800',
          fontSize: '0.85rem'
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000' }}>
        <div style={{ padding: '1.5rem', background: '#f4f4f5', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            CRONOGRAMA DE INVENTARIO PARCIAL (SEGUNDA A SEXTA)
          </div>
          {hasChanges && (
            <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#000000', background: '#ffffff', padding: '4px 8px', border: '1px solid #000000', borderRadius: '4px' }}>
              ALTERACOES PENDENTES
            </span>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #000000' }}>
                <th style={thStyle}>TECNICO</th>
                <th style={thStyle}>REGIAO</th>
                <th style={thStyle}>DIA DA SEMANA</th>
                <th style={thStyle}>HORARIO DO DISPARO</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', fontWeight: '700' }}>NENHUM TECNICO SOB GESTAO</td></tr>
              ) : (
                tecnicos.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                    <td style={{ ...tdStyle, fontWeight: '800', color: '#000000' }}>{t.name?.toUpperCase()}</td>
                    <td style={tdStyle}><span style={{ padding: '2px 8px', background: '#f4f4f5', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '800' }}>{t.region || '—'}</span></td>
                    <td style={tdStyle}>
                      <select
                        value={t.inventory_day || ''}
                        onChange={(e) => handleChange(t.id, 'inventory_day', e.target.value ? Number(e.target.value) : null)}
                        style={selectStyle}
                      >
                        <option value="">NAO DEFINIDO</option>
                        {DIAS_SEMANA.map(d => <option key={d.id} value={d.id}>{d.label.toUpperCase()}</option>)}
                      </select>
                    </td>
                    <td style={tdStyle}>
                      <input
                        type="time"
                        value={t.inventory_time || '09:00'}
                        onChange={(e) => handleChange(t.id, 'inventory_time', e.target.value)}
                        style={selectStyle}
                      />
                    </td>
                    <td style={tdStyle}>
                      {t.inventory_day ? (
                        <span style={{ color: '#000000', fontWeight: '800', fontSize: '0.7rem' }}>CONFIGURADO</span>
                      ) : (
                        <span style={{ color: '#a1a1aa', fontWeight: '700', fontSize: '0.7rem' }}>NAO DEFINIDO</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f9f9f9', border: '1px solid #e4e4e7', borderRadius: '8px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '900', color: '#000000', marginBottom: '0.75rem', textTransform: 'uppercase' }}>INSTRUCOES:</div>
        <ul style={{ fontSize: '0.8rem', color: '#52525b', lineHeight: '1.6', margin: 0, paddingLeft: '1.2rem', fontWeight: '600' }}>
          <li>DEFINA O DIA E HORARIO PARA CADA TECNICO.</li>
          <li>ALTERACOES EM MASSA SAO PERMITIDAS.</li>
          <li>CLIQUE EM SALVAR PLANEJAMENTO PARA CONFIRMAR AS MUDANCAS.</li>
          <li>TECNICOS SEM DIA DEFINIDO NAO RECEBERAO O INVENTARIO AUTOMATICO.</li>
        </ul>
      </div>
    </div>
  );
}

const thStyle = { padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase', background: '#ffffff' };
const tdStyle = { padding: '1rem', fontSize: '0.875rem', color: '#000000' };
const selectStyle = {
  width: '100%', padding: '0.5rem', border: '1px solid #000000', borderRadius: '4px',
  fontSize: '0.8rem', fontWeight: '800', background: '#ffffff', color: '#000000', cursor: 'pointer',
  textTransform: 'uppercase'
};
