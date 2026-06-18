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

function getWeekRef(dateStr) {
  const d = new Date(dateStr + 'T12:00:00Z');
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function SubgruposSection() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filterUF, setFilterUF] = useState('');
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

  const ufsDisponiveis = [...new Set(agendamentos.map(ag => ag.technician_region).filter(Boolean))].sort();

  const agendamentosFiltrados = filterUF
    ? agendamentos.filter(ag => ag.technician_region === filterUF)
    : agendamentos;

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

  const handleDelete = async (scheduleId, techName) => {
    if (!confirm(`Excluir agendamento de ${techName}?`)) return;
    setDeletingId(scheduleId);
    try {
      const res = await fetch(`/api/schedules/${scheduleId}`, { method: 'DELETE' });
      if (res.ok) {
        setAgendamentos(prev => prev.filter(ag => ag.id !== scheduleId));
        setMsg({ type: 'success', text: 'AGENDAMENTO EXCLUÍDO' });
        setTimeout(() => setMsg({ type: '', text: '' }), 4000);
      } else {
        setMsg({ type: 'error', text: 'ERRO AO EXCLUIR' });
      }
    } catch {
      setMsg({ type: 'error', text: 'ERRO DE CONEXÃO' });
    }
    setDeletingId(null);
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
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select
            value={filterUF}
            onChange={e => setFilterUF(e.target.value)}
            className="input"
            style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.35rem 0.6rem', minWidth: '90px' }}
          >
            <option value="">Todas UFs</option>
            {ufsDisponiveis.map(uf => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </select>
          <button
            className="btn"
            style={{ fontSize: '0.75rem', fontWeight: '700', padding: '0.4rem 0.9rem' }}
            onClick={load}
            disabled={loading}
          >
            {loading ? 'Atualizando...' : 'Atualizar'}
          </button>
        </div>
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
      ) : agendamentosFiltrados.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.85rem',
          border: '1px solid #eee', borderRadius: '8px',
        }}>
          {filterUF ? `Nenhum agendamento para UF ${filterUF}` : 'Nenhum agendamento pendente nos próximos 14 dias'}
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
                {agendamentosFiltrados.map(ag => {
                  const isGeneral = ag.inventory_type === 'general';
                  const changed = !isGeneral && pendingChanges[ag.id] !== undefined;
                  const currentSubgroup = changed ? pendingChanges[ag.id] : ag.scheduled_subgroup;
                  const isSaving = savingId === ag.id;
                  const isDeleting = deletingId === ag.id;

                  return (
                    <tr key={ag.id}>
                      <td style={{ fontWeight: '800', color: '#000' }}>{ag.technician_name}</td>
                      <td><span className="badge badge-info">{ag.technician_region || '—'}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(ag.scheduled_at)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatTime(ag.scheduled_at)}</td>
                      <td><span className="badge badge-info">{ag.week_ref || '—'}</span></td>
                      <td>
                        {isGeneral ? (
                          <span className="badge badge-ok" style={{ fontSize: '0.7rem' }}>INVENTÁRIO GERAL</span>
                        ) : ag.available_subgroups.length > 0 ? (
                          <select
                            value={currentSubgroup || ''}
                            onChange={e => setPendingChanges(prev => ({ ...prev, [ag.id]: e.target.value }))}
                            className="input"
                            style={{ width: '100%', maxWidth: '160px', fontWeight: '700' }}
                            disabled={isSaving || isDeleting}
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
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {changed && (
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '0.7rem', padding: '0.25rem 0.75rem', whiteSpace: 'nowrap' }}
                              disabled={isSaving || isDeleting}
                              onClick={() => handleSave(ag.id, pendingChanges[ag.id])}
                            >
                              {isSaving ? '...' : 'Salvar'}
                            </button>
                          )}
                          <button
                            className="btn"
                            style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem', color: '#cc0000', borderColor: '#cc0000', whiteSpace: 'nowrap' }}
                            disabled={isSaving || isDeleting}
                            onClick={() => handleDelete(ag.id, ag.technician_name)}
                          >
                            {isDeleting ? '...' : 'Excluir'}
                          </button>
                        </div>
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

function InventarioGeralSection({ onMsg }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [selectedTech, setSelectedTech] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [loading, setLoading] = useState(false);
  const [agendadosGeral, setAgendadosGeral] = useState([]);

  const loadAgendados = useCallback(async () => {
    try {
      const res = await fetch('/api/schedules/upcoming');
      const data = await res.json();
      setAgendadosGeral((Array.isArray(data) ? data : []).filter(a => a.inventory_type === 'general'));
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    fetch('/api/technicians?active=true')
      .then(r => r.json())
      .then(d => {
        const list = Array.isArray(d) ? d : [];
        setTecnicos(list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      })
      .catch(() => {});
    loadAgendados();
  }, [loadAgendados]);

  const today = new Date().toISOString().split('T')[0];

  const handleSubmit = async () => {
    if (!selectedTech || !date) {
      onMsg?.({ type: 'error', text: 'SELECIONE O TÉCNICO E A DATA' });
      return;
    }
    setLoading(true);
    try {
      const scheduledAt = new Date(`${date}T${time}:00-03:00`).toISOString();
      const weekRef = getWeekRef(date);

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technician_id: Number(selectedTech),
          scheduled_at: scheduledAt,
          week_ref: weekRef,
          inventory_type: 'general',
        }),
      });

      if (res.ok) {
        onMsg?.({ type: 'success', text: 'INVENTÁRIO GERAL AGENDADO COM SUCESSO' });
        setSelectedTech('');
        setDate('');
        setTime('09:00');
        loadAgendados();
      } else {
        const err = await res.json();
        onMsg?.({ type: 'error', text: (err.error || 'ERRO AO AGENDAR').toUpperCase() });
      }
    } catch {
      onMsg?.({ type: 'error', text: 'ERRO DE CONEXÃO' });
    }
    setLoading(false);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Inventário Geral</h2>
        <p style={{ fontSize: '0.75rem', color: '#666', margin: '0.2rem 0 0' }}>
          Agenda um inventário completo (todas as peças) para o técnico selecionado
        </p>
      </div>

      <div className="card" style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '2', minWidth: '200px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.3rem' }}>
            Técnico
          </label>
          <select
            value={selectedTech}
            onChange={e => setSelectedTech(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          >
            <option value="">— Selecione —</option>
            {tecnicos.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.region || '—'})</option>
            ))}
          </select>
        </div>

        <div style={{ flex: '1', minWidth: '140px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.3rem' }}>
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="input"
            style={{ width: '100%' }}
            min={today}
          />
        </div>

        <div style={{ flex: '1', minWidth: '100px' }}>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', display: 'block', marginBottom: '0.3rem' }}>
            Horário
          </label>
          <input
            type="time"
            value={time}
            onChange={e => setTime(e.target.value)}
            className="input"
            style={{ width: '100%' }}
          />
        </div>

        <button
          className="btn btn-primary"
          onClick={handleSubmit}
          disabled={loading || !selectedTech || !date}
          style={{ whiteSpace: 'nowrap' }}
        >
          {loading ? 'Agendando...' : 'Agendar Inventário Geral'}
        </button>
      </div>

      {agendadosGeral.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Inventários gerais agendados (próximos 14 dias)
          </div>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrapper" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Técnico</th>
                    <th>UF</th>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Semana</th>
                  </tr>
                </thead>
                <tbody>
                  {agendadosGeral.map(ag => (
                    <tr key={ag.id}>
                      <td style={{ fontWeight: '800', color: '#000' }}>{ag.technician_name}</td>
                      <td><span className="badge badge-info">{ag.technician_region || '—'}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{formatDate(ag.scheduled_at)}</td>
                      <td style={{ fontSize: '0.85rem' }}>{formatTime(ag.scheduled_at)}</td>
                      <td><span className="badge badge-info">{ag.week_ref || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EscalonamentoSection({ onMsg }) {
  const [tecnicos, setTecnicos] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [search, setSearch] = useState('');
  const [filterUF, setFilterUF] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

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

  const ufsDisponiveis = [...new Set(tecnicos.map(t => t.region).filter(Boolean))].sort();

  const filtered = tecnicos.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.region && t.region.toLowerCase().includes(search.toLowerCase()));
    const matchUF = !filterUF || t.region === filterUF;
    const configurado = !!t.inventory_day;
    const matchStatus = !filterStatus ||
      (filterStatus === 'configurado' && configurado) ||
      (filterStatus === 'pendente' && !configurado);
    return matchSearch && matchUF && matchStatus;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: '800', margin: 0 }}>Inventário Semanal Cíclico (Parcial)</h2>
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

      <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Buscar técnico..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1, minWidth: '160px' }}
        />
        <select
          value={filterUF}
          onChange={e => setFilterUF(e.target.value)}
          className="input"
          style={{ fontSize: '0.75rem', fontWeight: '700', minWidth: '110px' }}
        >
          <option value="">Todas UFs</option>
          {ufsDisponiveis.map(uf => (
            <option key={uf} value={uf}>{uf}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="input"
          style={{ fontSize: '0.75rem', fontWeight: '700', minWidth: '130px' }}
        >
          <option value="">Todos os status</option>
          <option value="configurado">Configurado</option>
          <option value="pendente">Pendente</option>
        </select>
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

  const role = session?.user?.role;
  const isAdmin = role === 'admin';
  const isSupervisor = role === 'supervisor';

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

      {(isAdmin || isSupervisor) && (
        <>
          <InventarioGeralSection onMsg={showMsg} />
          <hr style={{ margin: '2.5rem 0', border: 'none', borderTop: '2px solid #eee' }} />
        </>
      )}

      {isAdmin && (
        <>
          <SubgruposSection />
          <hr style={{ margin: '2.5rem 0', border: 'none', borderTop: '2px solid #eee' }} />
        </>
      )}

      <EscalonamentoSection onMsg={showMsg} />
    </div>
  );
}
