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

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  });
}

// ── Seção: Subgrupos (só carrega estado próprio) ──────────────────────────────
function SubgruposSection() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [msg, setMsg] = useState({ type: '', text: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/schedules/upcoming');
      const data = await res.json();
      setAgendamentos(Array.isArray(data) ? data : []);
    } catch {
      setAgendamentos([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (scheduleId, newSubgroup) => {
    setSavingId(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_subgroup: newSubgroup }),
      });
      if (res.ok) {
        const updated = await res.json();
        setAgendamentos(prev => prev.map(ag => ag.id === scheduleId
          ? { ...ag, scheduled_subgroup: updated.scheduled_subgroup, items_count: updated.items_count }
          : ag
        ));
        setPendingChanges(prev => { const n = { ...prev }; delete n[scheduleId]; return n; });
        setMsg({ type: 'success', text: 'SUBGRUPO ATUALIZADO' });
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      } else {
        setMsg({ type: 'error', text: 'ERRO AO ATUALIZAR SUBGRUPO' });
      }
    } catch {
      setMsg({ type: 'error', text: 'ERRO DE CONEXÃO' });
    }
    setSavingId(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Subgrupos de Inventário</h2>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.2rem 0 0' }}>
            Próximos 14 dias — ajuste o subgrupo antes do disparo D-1
          </p>
        </div>
        <button
          className="btn"
          style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.4rem 0.9rem' }}
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {msg.text && (
        <div style={{
          padding: '0.6rem 0.75rem', background: '#f0f0f0', color: '#000',
          border: '1px solid #000', borderRadius: '4px', marginBottom: '1rem',
          fontSize: '0.8rem', fontWeight: '700',
        }}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', fontWeight: '700' }}>Carregando...</div>
      ) : agendamentos.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.85rem',
          border: '1px solid #eee', borderRadius: '8px',
        }}>
          Nenhum agendamento pendente nos próximos 14 dias
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: '1rem' }}>
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>UF</th>
                  <th>Data</th>
                  <th>Horário</th>
                  <th>Semana</th>
                  <th>Subgrupo</th>
                  <th style={{ textAlign: 'center' }}>Peças</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {agendamentos.map(ag => {
                  const changed = pendingChanges[ag.id] !== undefined;
                  const currentSubgroup = changed ? pendingChanges[ag.id] : ag.scheduled_subgroup;
                  const isSaving = savingId === ag.id;

                  return (
                    <tr key={ag.id}>
                      <td style={{ fontWeight: '800', color: '#000' }}>{ag.technician_name}</td>
                      <td><span className="badge badge-info">{ag.technician_region || '—'}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(ag.scheduled_at)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatTime(ag.scheduled_at)}</td>
                      <td><span className="badge badge-info">{ag.week_ref || '—'}</span></td>
                      <td>
                        {ag.available_subgroups.length > 0 ? (
                          <select
                            value={currentSubgroup || ''}
                            onChange={e => setPendingChanges(prev => ({ ...prev, [ag.id]: e.target.value }))}
                            className="input"
                            style={{ width: '100%', maxWidth: '160px', fontWeight: '700' }}
                            disabled={isSaving}
                          >
                            <option value="">— Selecione —</option>
                            {ag.available_subgroups.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#999' }}>
                            {currentSubgroup || 'Sem subgrupo'}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '700' }}>
                        {changed ? <span style={{ color: '#999' }}>?</span> : (ag.items_count ?? '—')}
                      </td>
                      <td>
                        {changed && (
                          <button
                            className="btn btn-primary"
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' }}
                            disabled={isSaving}
                            onClick={() => handleSave(ag.id, pendingChanges[ag.id])}
                          >
                            {isSaving ? '...' : 'Salvar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Seção: Escalonamento (carrega técnicos) ───────────────────────────────────
function EscalonamentoSection({ onMsg }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/technicians?active=true');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTecnicos(list);
      setOriginalData(JSON.parse(JSON.stringify(list)));
      setHasChanges(false);
    } catch {
      onMsg?.({ type: 'error', text: 'Erro ao carregar técnicos' });
    }
    setLoading(false);
  }, [onMsg]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (techId, field, value) => {
    setTecnicos(prev => {
      const newList = prev.map(t => t.id === techId ? { ...t, [field]: value } : t);
      setHasChanges(JSON.stringify(newList) !== JSON.stringify(originalData));
      return newList;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const changes = tecnicos.filter(t =>
        JSON.stringify(t) !== JSON.stringify(originalData.find(o => o.id === t.id))
      );
      if (!changes.length) { setSaving(false); return; }

      const results = await Promise.all(changes.map(t =>
        fetch(`/api/technicians/${t.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ inventory_day: t.inventory_day, inventory_time: t.inventory_time }),
        })
      ));

      if (results.every(r => r.ok)) {
        onMsg?.({ type: 'success', text: `PLANEJAMENTO DE ${changes.length} TÉCNICO(S) ATUALIZADO` });
        setOriginalData(JSON.parse(JSON.stringify(tecnicos)));
        setHasChanges(false);
      } else {
        onMsg?.({ type: 'error', text: 'ERRO AO SALVAR' });
      }
    } catch {
      onMsg?.({ type: 'error', text: 'ERRO DE CONEXÃO' });
    }
    setSaving(false);
  };

  const filtered = tecnicos.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    (t.region && t.region.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Gestão de Escalonamento</h2>
          <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.2rem 0 0' }}>
            Defina o dia e horário do inventário para cada técnico ativo
          </p>
        </div>
        {hasChanges && (
          <button className="btn btn-primary" onClick={handleSaveAll} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Planejamento'}
          </button>
        )}
      </div>

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
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

      {loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
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
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Nenhum técnico ativo encontrado</td></tr>
                ) : filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: '800', color: '#000' }}>{t.name}</td>
                    <td><span className="badge badge-info">{t.region || '—'}</span></td>
                    <td>
                      <select
                        value={t.inventory_day || ''}
                        onChange={e => handleChange(t.id, 'inventory_day', e.target.value ? Number(e.target.value) : null)}
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
                        onChange={e => handleChange(t.id, 'inventory_time', e.target.value)}
                        className="input"
                        style={{ width: '120px', fontWeight: '700' }}
                      />
                    </td>
                    <td>
                      {t.inventory_day
                        ? <span className="badge badge-ok">CONFIGURADO</span>
                        : <span className="badge badge-not-ok">PENDENTE</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function AgendamentosPage() {
  const { data: session, status } = useSession();
  const [msg, setMsg] = useState({ type: '', text: '' });

  const showMsg = useCallback((m) => {
    setMsg(m);
    setTimeout(() => setMsg({ type: '', text: '' }), 5000);
  }, []);

  if (status === 'loading') {
    return <div style={{ padding: '2rem', textAlign: 'center', fontWeight: '700' }}>Carregando...</div>;
  }

  const isAdmin = session?.user?.role === 'admin';

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Agendamentos"
        subtitle={isAdmin
          ? 'Gerencie os subgrupos dos inventários pendentes e o escalonamento dos técnicos'
          : 'Defina o dia e horário do inventário para os técnicos ativos'
        }
      />

      {msg.text && (
        <div style={{
          padding: '0.75rem', background: '#f0f0f0', color: '#000',
          border: '1px solid #000', borderRadius: '4px', marginBottom: '1.5rem',
          fontSize: '0.8rem', fontWeight: '700',
        }}>
          {msg.text}
        </div>
      )}

      {/* Subgrupos: só admin vê */}
      {isAdmin && (
        <>
          <SubgruposSection />
          <hr style={{ margin: '2.5rem 0', border: 'none', borderTop: '2px solid #eee' }} />
        </>
      )}

      {/* Escalonamento: todos veem */}
      <EscalonamentoSection onMsg={showMsg} />
    </div>
  );
}
