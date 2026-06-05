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
  { id: 6, label: 'Sábado' },
];

export default function GestaoEscalonamentoPage() {
  const { data: session, status } = useSession();
  const [tecnicos, setTecnicos] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Agora a API processa corretamente o filtro active=true
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
        return JSON.stringify(t) !== JSON.stringify(originalData.find(o => o.id === t.id));
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
        setMsg({ type: 'success', text: `PLANEJAMENTO DE ${changes.length} TÉCNICO(S) ATUALIZADO` });
        setOriginalData(JSON.parse(JSON.stringify(tecnicos)));
        setHasChanges(false);
      } else {
        setMsg({ type: 'error', text: 'ERRO AO SALVAR' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'ERRO DE CONEXÃO' });
    }
    setSaving(false);
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  };

  if (status === 'loading' || loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Carregando...</div>;
  }

  const isAdmin = session?.user?.role === 'admin';

  // Filtro de busca local
  const filteredTecnicos = tecnicos.filter(t => 
    t.name.toLowerCase().includes(search.toLowerCase()) || 
    (t.region && t.region.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Gestão de Escalonamento"
        subtitle={isAdmin ? "Planejamento semanal de todos os técnicos ativos" : `Planejamento dos técnicos ativos sob gestão de ${session?.user?.name}`}
        actions={
          hasChanges && (
            <button 
              className="btn btn-primary" 
              onClick={handleSaveAll} 
              disabled={saving}
            >
              {saving ? 'Salvando...' : 'Salvar Planejamento'}
            </button>
          )
        }
      />

      {msg.text && (
        <div style={{ 
          padding: '0.75rem', 
          background: '#f0f0f0', 
          color: '#000000', 
          border: '1px solid #000000', 
          borderRadius: '4px', 
          marginBottom: '1rem', 
          fontSize: '0.8rem', 
          fontWeight: '700' 
        }}>
          {msg.text}
        </div>
      )}

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar técnico ou região..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1 }}
        />
        {hasChanges && (
          <span className="badge badge-not-ok" style={{ padding: '0.5rem 1rem' }}>
            ALTERAÇÕES PENDENTES
          </span>
        )}
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>UF</th>
                <th>Dia da Semana</th>
                <th>Horário do Disparo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTecnicos.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Nenhum técnico ativo encontrado</td></tr>
              ) : (
                filteredTecnicos.map((t) => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '800', color: '#000000' }}>{t.name}</td>
                    <td><span className="badge badge-info">{t.region || '—'}</span></td>
                    <td>
                      <select
                        value={t.inventory_day || ''}
                        onChange={(e) => handleChange(t.id, 'inventory_day', e.target.value ? Number(e.target.value) : null)}
                        className="input"
                        style={{ width: '100%', maxWidth: '200px', fontWeight: '700' }}
                      >
                        <option value="">Não Definido</option>
                        {DIAS_SEMANA.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                      </select>
                    </td>
                    <td>
                      <input
                        type="time"
                        value={t.inventory_time || '09:00'}
                        onChange={(e) => handleChange(t.id, 'inventory_time', e.target.value)}
                        className="input"
                        style={{ width: '120px', fontWeight: '700' }}
                      />
                    </td>
                    <td>
                      {t.inventory_day ? (
                        <span className="badge badge-ok">CONFIGURADO</span>
                      ) : (
                        <span className="badge badge-not-ok">PENDENTE</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#ffffff', border: '1px solid #eeeeee', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#000000', marginBottom: '0.5rem' }}>Instruções de Uso</h3>
        <p style={{ fontSize: '0.8rem', color: '#666666', lineHeight: '1.5' }}>
          Utilize este painel para definir a escala semanal de inventário parcial apenas para técnicos ativos. 
          As alterações feitas na tabela só serão aplicadas após clicar no botão <strong>Salvar Planejamento</strong>.
          Técnicos inativados no cadastro não aparecerão nesta listagem.
        </p>
      </div>
    </div>
  );
}