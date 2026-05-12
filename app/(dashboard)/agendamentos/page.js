'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

const STATUS_LABEL = {
  pending: 'Aguardando',
  dispatched: 'Disparado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_STYLE = {
  pending: { background: '#1f1f1f', color: '#a3a3a3', border: '1px solid #2a2a2a' },
  dispatched: { background: '#1f1f1f', color: '#f0f0f0', border: '1px solid #3a3a3a' },
  completed: { background: '#1a1a1a', color: '#d4d4d4', border: '1px solid #2a2a2a' },
  cancelled: { background: '#1a1a1a', color: '#525252', border: '1px solid #222222' },
};

function getWeekRef(date) {
  const d = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export default function AgendamentosPage() {
  const { data: session, status } = useSession();
  const [schedules, setSchedules] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    technician_id: '',
    scheduled_at: '',
    items_count: 10,
    notes: '',
  });

  useEffect(() => {
    if (status === 'authenticated') {
      fetchData();
    }
  }, [status]);

  async function fetchData() {
    setLoading(true);
    const [s, t] = await Promise.all([
      fetch('/api/schedules').then((r) => r.json()),
      fetch('/api/technicians').then((r) => r.json()),
    ]);
    setSchedules(Array.isArray(s) ? s : []);
    setTechnicians(Array.isArray(t) ? t : []);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    try {
      const dt = new Date(form.scheduled_at);
      const week_ref = getWeekRef(dt);
      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, week_ref }),
      });
      if (!res.ok) {
        const err = await res.json();
        setMsg(err.error || 'Erro ao criar agendamento');
      } else {
        setMsg('Agendamento criado com sucesso.');
        setShowForm(false);
        setForm({ technician_id: '', scheduled_at: '', items_count: 10, notes: '' });
        fetchData();
      }
    } catch {
      setMsg('Erro de conexão');
    }
    setSaving(false);
  }

  async function handleCancel(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
    fetchData();
  }

  async function handleDispatch(id) {
    if (!confirm('Disparar este inventário agora para o técnico via WhatsApp?')) return;
    setMsg('Disparando...');
    const res = await fetch('/api/webhook/dispatch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schedule_id: id }),
    });
    const data = await res.json();
    if (data.ok) {
      setMsg(`Disparado com sucesso para ${data.results?.[0]?.technician || 'técnico'}.`);
    } else {
      setMsg(data.results?.[0]?.reason || 'Erro no disparo');
    }
    fetchData();
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '1.5rem', color: '#525252' }}>Carregando...</div>;
  }

  const canManage = ['admin', 'supervisor'].includes(session?.user?.role);

  return (
    <div style={{ padding: '1.5rem' }}>
      <PageHeader
        title="Agendamentos"
        subtitle="Programe quando cada técnico deve realizar o inventário"
        action={canManage ? (
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Fechar' : '+ Novo Agendamento'}
          </button>
        ) : null}
      />

      {msg && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          background: '#1a1a1a',
          border: '1px solid #2a2a2a',
          borderRadius: '8px',
          color: '#d4d4d4',
          fontSize: '0.875rem',
        }}>
          {msg}
        </div>
      )}

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Novo Agendamento</div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={labelStyle}>Técnico</label>
                <select
                  className="input"
                  required
                  value={form.technician_id}
                  onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
                >
                  <option value="">Selecione o técnico</option>
                  {technicians.filter((t) => t.active).map((t) => (
                    <option key={t.id} value={t.id}>{t.name} — {t.region}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Data e Hora do Disparo</label>
                <input
                  type="datetime-local"
                  className="input"
                  required
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Quantidade de Peças</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={50}
                  value={form.items_count}
                  onChange={(e) => setForm({ ...form, items_count: Number(e.target.value) })}
                />
              </div>
              <div>
                <label style={labelStyle}>Observações (opcional)</label>
                <input
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações para este inventário"
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Salvando...' : 'Criar Agendamento'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="section-title" style={{ marginBottom: '1rem' }}>
          Agendamentos ({schedules.length})
        </div>
        {schedules.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#525252', fontSize: '0.875rem' }}>
            Nenhum agendamento encontrado. Crie o primeiro agendamento acima.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Técnico</th>
                  <th>Região</th>
                  <th>Data / Hora</th>
                  <th>Semana</th>
                  <th>Peças</th>
                  <th>Status</th>
                  {canManage && <th>Ações</th>}
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: '500', color: '#f0f0f0' }}>
                      {s.technicians?.name || '—'}
                    </td>
                    <td style={{ color: '#737373' }}>{s.technicians?.region || '—'}</td>
                    <td style={{ color: '#a3a3a3', fontSize: '0.85rem' }}>
                      {new Date(s.scheduled_at).toLocaleString('pt-BR')}
                    </td>
                    <td style={{ color: '#737373', fontSize: '0.85rem' }}>{s.week_ref}</td>
                    <td style={{ color: '#a3a3a3' }}>{s.items_count}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: '500',
                        padding: '2px 8px', borderRadius: '4px',
                        ...STATUS_STYLE[s.status],
                      }}>
                        {STATUS_LABEL[s.status] || s.status}
                      </span>
                    </td>
                    {canManage && (
                      <td>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {s.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleDispatch(s.id)}
                                style={actionBtnStyle}
                                title="Disparar agora"
                              >
                                Disparar
                              </button>
                              <button
                                onClick={() => handleCancel(s.id)}
                                style={{ ...actionBtnStyle, color: '#525252' }}
                                title="Cancelar"
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '500',
  color: '#525252',
  marginBottom: '0.375rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const actionBtnStyle = {
  background: '#1f1f1f',
  border: '1px solid #2a2a2a',
  borderRadius: '5px',
  color: '#d4d4d4',
  fontSize: '0.75rem',
  padding: '3px 10px',
  cursor: 'pointer',
};
