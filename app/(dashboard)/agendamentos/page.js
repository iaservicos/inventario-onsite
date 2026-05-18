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
      setMsg({ type: 'error', text: 'ERRO AO CARREGAR DADOS' });
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
        setMsg({ type: 'success', text: `PLANEJAMENTO DE ${changes.length} TECNICO(S) ATUALIZADO` });
        setOriginalData(JSON.parse(JSON.stringify(tecnicos)));
        setHasChanges(false);
      } else {
        setMsg({ type: 'error', text: 'ERRO AO SALVAR' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'ERRO DE CONEXAO' });
    }
    setSaving(false);
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '800' }}>CARREGANDO...</div>;
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div style={{ padding: '2rem' }}>
      <PageHeader
        title="GESTAO DE ESCALONAMENTO"
        subtitle={isAdmin ? "PLANEJAMENTO SEMANAL DE TODOS OS TECNICOS" : `PLANEJAMENTO DOS TECNICOS SOB GESTAO DE ${session?.user?.name?.toUpperCase()}`}
        actions={
          <button
            onClick={handleSaveAll}
            disabled={!hasChanges || saving}
            style={{
              background: hasChanges ? '#000000' : '#f4f4f5',
              color: hasChanges ? '#ffffff' : '#a1a1aa',
              border: '2px solid #000000',
              fontWeight: '900',
              padding: '0.6rem 1.5rem',
              borderRadius: '4px',
              cursor: hasChanges ? 'pointer' : 'not-allowed',
              fontSize: '0.75rem',
              transition: 'all 0.1s ease',
              textTransform: 'uppercase'
            }}
          >
            {saving ? 'SALVANDO...' : 'SALVAR PLANEJAMENTO'}
          </button>
        }
      />

      {msg.text && (
        <div style={{
          marginBottom: '1.5rem', padding: '1rem',
          background: '#ffffff', color: '#000000',
          border: '2px solid #000000', borderRadius: '4px',
          fontWeight: '900', fontSize: '0.8rem', textAlign: 'center'
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '2px solid #000000', background: '#ffffff' }}>
        <div style={{ padding: '1.25rem', background: '#f4f4f5', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '900', letterSpacing: '0.05em' }}>
            CRONOGRAMA SEMANAL (SEGUNDA A SEXTA)
          </div>
          {hasChanges && (
            <span style={{ fontSize: '0.65rem', fontWeight: '900', color: '#ffffff', background: '#000000', padding: '4px 8px', borderRadius: '2px' }}>
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
                <th style={thStyle}>HORARIO DISPARO</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '3rem', textAlign: 'center', fontWeight: '800' }}>NENHUM TECNICO ENCONTRADO</td></tr>
              ) : (
                tecnicos.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #000000' }}>
                    <td style={{ ...tdStyle, fontWeight: '900' }}>{t.name?.toUpperCase()}</td>
                    <td style={tdStyle}><span style={{ fontWeight: '800' }}>{t.region || '—'}</span></td>
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
                      <span style={{ fontWeight: '900', fontSize: '0.7rem' }}>
                        {t.inventory_day ? 'CONFIGURADO' : 'PENDENTE'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', border: '2px solid #000000' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: '900', marginBottom: '0.5rem' }}>INSTRUCOES:</div>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', lineHeight: '1.4' }}>
          1. DEFINA O DIA E HORARIO PARA CADA TECNICO.<br/>
          2. CLIQUE EM SALVAR PLANEJAMENTO PARA CONFIRMAR AS MUDANCAS.<br/>
          3. TECNICOS SEM DIA DEFINIDO NAO RECEBERAO O INVENTARIO AUTOMATICO.
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: '1rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: '900', textTransform: 'uppercase' };
const tdStyle = { padding: '1rem', fontSize: '0.8rem' };
const selectStyle = {
  width: '100%', padding: '0.4rem', border: '2px solid #000000', borderRadius: '0',
  fontSize: '0.75rem', fontWeight: '900', background: '#ffffff', cursor: 'pointer'
};
