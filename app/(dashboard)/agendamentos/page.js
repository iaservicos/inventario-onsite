'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate } from '@/lib/utils';

const STATUS_LABEL = {
  pending: 'Aguardando',
  dispatched: 'Disparado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  abandoned: 'Abandonado',
};

const STATUS_STYLE = {
  pending: { background: '#ffffff', color: '#000000', border: '2px solid #000000', fontWeight: '700' },
  dispatched: { background: '#e4e4e7', color: '#000000', border: '1px solid #a1a1aa', fontWeight: '600' },
  completed: { background: '#f4f4f5', color: '#52525b', border: '1px solid #e4e4e7', fontWeight: '600' },
  cancelled: { background: '#fafafa', color: '#a1a1aa', border: '1px solid #e4e4e7', fontWeight: '500' },
  abandoned: { background: '#f9f9f9', color: '#71717a', border: '1px solid #d4d4d8', fontWeight: '500' },
};

function getWeekRef(date) {
  const d = new Date(date);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const next = new Date(now.setDate(diff));
  next.setHours(9, 0, 0, 0);
  return next.toISOString().slice(0, 16);
}

export default function AgendamentosPage() {
  const { data: session, status } = useSession();
  const [schedules, setSchedules] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [filter, setFilter] = useState({ status: '', technician: '' });

  const [form, setForm] = useState({
    technician_id: '',
    scheduled_at: getNextMonday(),
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
    try {
      const [s, t] = await Promise.all([
        fetch('/api/schedules').then((r) => r.json()),
        fetch('/api/technicians').then((r) => r.json()),
      ]);
      setSchedules(Array.isArray(s) ? s : []);
      setTechnicians(Array.isArray(t) ? t : []);
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao carregar dados' });
    }
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    try {
      if (!form.technician_id || !form.scheduled_at) {
        setMsg({ type: 'error', text: 'Técnico e data/hora são obrigatórios' });
        setSaving(false);
        return;
      }

      const dt = new Date(form.scheduled_at);
      const week_ref = getWeekRef(dt);

      const res = await fetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          technician_id: Number(form.technician_id),
          items_count: Number(form.items_count) || 10,
          week_ref,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        setMsg({ type: 'error', text: err.error || 'Erro ao criar agendamento' });
      } else {
        setMsg({ type: 'success', text: 'Agendamento criado com sucesso!' });
        setShowForm(false);
        setForm({
          technician_id: '',
          scheduled_at: getNextMonday(),
          items_count: 10,
          notes: '',
        });
        fetchData();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro de conexão' });
    }
    setSaving(false);
  }

  async function handleCancel(id) {
    if (!confirm('Cancelar este agendamento?')) return;
    try {
      await fetch(`/api/schedules/${id}`, { method: 'DELETE' });
      setMsg({ type: 'success', text: 'Agendamento cancelado' });
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao cancelar' });
    }
  }

  async function handleDispatch(id) {
    if (!confirm('Disparar este inventário agora para o técnico via WhatsApp?')) return;
    setMsg({ type: '', text: 'Disparando...' });
    try {
      const res = await fetch('/api/webhook/dispatch-databricks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dispatch-secret': process.env.NEXT_PUBLIC_DISPATCH_SECRET || '',
        },
        body: JSON.stringify({ schedule_id: id }),
      });
      const data = await res.json();
      if (data.ok) {
        setMsg({ type: 'success', text: `✓ Disparado com sucesso para ${data.technician}` });
      } else {
        setMsg({ type: 'error', text: data.error || 'Erro no disparo' });
      }
      fetchData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Erro ao disparar' });
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#52525b' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>Carregando agendamentos...</div>
      </div>
    );
  }

  const canManage = ['admin', 'supervisor'].includes(session?.user?.role);

  // Filtra agendamentos
  let filtered = schedules;
  if (filter.status) {
    filtered = filtered.filter(s => s.status === filter.status);
  }
  if (filter.technician) {
    filtered = filtered.filter(s => s.technician_id === Number(filter.technician));
  }

  // Agrupa por status
  const grouped = {
    pending: filtered.filter(s => s.status === 'pending'),
    dispatched: filtered.filter(s => s.status === 'dispatched'),
    completed: filtered.filter(s => s.status === 'completed'),
    other: filtered.filter(s => !['pending', 'dispatched', 'completed'].includes(s.status)),
  };

  return (
    <div style={{ padding: '2rem' }}>
      <PageHeader
        title="Agendamentos de Inventário"
        subtitle="Programe quando cada técnico deve realizar o inventário cíclico"
        action={canManage ? (
          <button
            className="btn-primary"
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? '#f4f4f5' : '#000000',
              color: showForm ? '#000000' : '#ffffff',
              border: showForm ? '2px solid #000000' : 'none',
              fontWeight: '700',
              padding: '0.5rem 1rem',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            {showForm ? '✕ Fechar' : '+ Novo Agendamento'}
          </button>
        ) : null}
      />

      {msg.text && (
        <div
          style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: msg.type === 'error' ? '#fafafa' : '#ffffff',
            border: `2px solid ${msg.type === 'error' ? '#e4e4e7' : '#000000'}`,
            borderRadius: '8px',
            color: msg.type === 'error' ? '#52525b' : '#000000',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}
        >
          {msg.type === 'error' ? '❌ ' : '✓ '}{msg.text}
        </div>
      )}

      {showForm && (
        <div
          className="card"
          style={{
            marginBottom: '2rem',
            border: '2px solid #000000',
            background: '#ffffff',
            padding: '1.5rem',
          }}
        >
          <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#000000', marginBottom: '1.5rem' }}>
            Novo Agendamento
          </div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Técnico *</label>
                <select
                  className="input"
                  required
                  value={form.technician_id}
                  onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                >
                  <option value="">— Selecione um técnico —</option>
                  {technicians.filter((t) => t.active).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.region ? `(${t.region})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Data e Hora *</label>
                <input
                  type="datetime-local"
                  className="input"
                  required
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Quantidade de Peças</label>
                <input
                  type="number"
                  className="input"
                  min={1}
                  max={50}
                  value={form.items_count}
                  onChange={(e) => setForm({ ...form, items_count: Number(e.target.value) })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #000000',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                />
              </div>

              <div>
                <label style={{ ...labelStyle, marginBottom: '0.5rem' }}>Observações</label>
                <input
                  type="text"
                  className="input"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Observações opcionais..."
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #a1a1aa',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    background: '#ffffff',
                    color: '#000000',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: '#000000',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '700',
                  fontSize: '0.875rem',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Salvando...' : 'Criar Agendamento'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                style={{
                  background: '#f4f4f5',
                  color: '#000000',
                  border: '1px solid #a1a1aa',
                  borderRadius: '6px',
                  padding: '0.75rem 1.5rem',
                  fontWeight: '600',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filtros */}
      <div
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          gap: '1rem',
          padding: '1rem',
          background: '#f9f9f9',
          border: '1px solid #e4e4e7',
          borderRadius: '8px',
        }}
      >
        <div>
          <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>Status</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #a1a1aa',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: '#ffffff',
              color: '#000000',
            }}
          >
            <option value="">Todos</option>
            <option value="pending">Aguardando</option>
            <option value="dispatched">Disparado</option>
            <option value="completed">Concluído</option>
          </select>
        </div>
        <div>
          <label style={{ ...labelStyle, marginBottom: '0.375rem' }}>Técnico</label>
          <select
            value={filter.technician}
            onChange={(e) => setFilter({ ...filter, technician: e.target.value })}
            style={{
              padding: '0.5rem 0.75rem',
              border: '1px solid #a1a1aa',
              borderRadius: '4px',
              fontSize: '0.8rem',
              fontWeight: '600',
              background: '#ffffff',
              color: '#000000',
            }}
          >
            <option value="">Todos</option>
            {technicians.filter(t => t.active).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Agendamentos por Status */}
      {grouped.pending.length > 0 && (
        <ScheduleSection
          title="Aguardando Disparo"
          schedules={grouped.pending}
          canManage={canManage}
          onDispatch={handleDispatch}
          onCancel={handleCancel}
        />
      )}

      {grouped.dispatched.length > 0 && (
        <ScheduleSection
          title="Disparados"
          schedules={grouped.dispatched}
          canManage={canManage}
          showActions={false}
        />
      )}

      {grouped.completed.length > 0 && (
        <ScheduleSection
          title="Concluídos"
          schedules={grouped.completed}
          canManage={canManage}
          showActions={false}
        />
      )}

      {grouped.other.length > 0 && (
        <ScheduleSection
          title="Outros"
          schedules={grouped.other}
          canManage={canManage}
          showActions={false}
        />
      )}

      {filtered.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 2rem',
            background: '#f9f9f9',
            border: '1px solid #e4e4e7',
            borderRadius: '8px',
            color: '#71717a',
            fontWeight: '600',
          }}
        >
          Nenhum agendamento encontrado com os filtros selecionados.
        </div>
      )}
    </div>
  );
}

function ScheduleSection({ title, schedules, canManage, onDispatch, onCancel, showActions = true }) {
  return (
    <div
      className="card"
      style={{
        marginBottom: '1.5rem',
        border: '1px solid #e4e4e7',
        background: '#ffffff',
        padding: '0',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '1rem 1.5rem',
          background: '#f4f4f5',
          borderBottom: '1px solid #e4e4e7',
          fontWeight: '800',
          color: '#000000',
          fontSize: '0.95rem',
        }}
      >
        {title} ({schedules.length})
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #000000', background: '#ffffff' }}>
              <th style={thStyle}>Técnico</th>
              <th style={thStyle}>Região</th>
              <th style={thStyle}>Data / Hora</th>
              <th style={thStyle}>Semana</th>
              <th style={thStyle}>Peças</th>
              <th style={thStyle}>Status</th>
              {showActions && canManage && <th style={thStyle}>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} style={{ borderBottom: '1px solid #e4e4e7' }}>
                <td style={{ ...tdStyle, fontWeight: '700', color: '#000000' }}>
                  {s.technicians?.name || '—'}
                </td>
                <td style={{ ...tdStyle, color: '#52525b' }}>
                  {s.technicians?.region || '—'}
                </td>
                <td style={{ ...tdStyle, color: '#52525b', fontSize: '0.85rem' }}>
                  {new Date(s.scheduled_at).toLocaleString('pt-BR')}
                </td>
                <td style={{ ...tdStyle, color: '#52525b', fontSize: '0.85rem' }}>
                  {s.week_ref}
                </td>
                <td style={{ ...tdStyle, color: '#52525b', fontWeight: '600' }}>
                  {s.items_count}
                </td>
                <td style={tdStyle}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: '700',
                      padding: '4px 10px',
                      borderRadius: '4px',
                      display: 'inline-block',
                      ...STATUS_STYLE[s.status],
                    }}
                  >
                    {STATUS_LABEL[s.status] || s.status}
                  </span>
                </td>
                {showActions && canManage && (
                  <td style={{ ...tdStyle, display: 'flex', gap: '0.5rem' }}>
                    {s.status === 'pending' && (
                      <>
                        <button
                          onClick={() => onDispatch(s.id)}
                          style={{
                            background: '#000000',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                          }}
                          title="Disparar agora"
                        >
                          Disparar
                        </button>
                        <button
                          onClick={() => onCancel(s.id)}
                          style={{
                            background: '#f4f4f5',
                            color: '#52525b',
                            border: '1px solid #a1a1aa',
                            borderRadius: '4px',
                            padding: '3px 8px',
                            fontSize: '0.7rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                          }}
                          title="Cancelar"
                        >
                          Cancelar
                        </button>
                      </>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#52525b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '800',
  color: '#000000',
  background: '#ffffff',
  borderBottom: '2px solid #000000',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  color: '#52525b',
};
