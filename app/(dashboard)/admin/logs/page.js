'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';

const EVENT_LABELS = { login: 'Login', page_view: 'Página', action: 'Ação' };

const PAGE_LABELS = {
  '/dashboard': 'Dashboard Inventário', '/tecnicos': 'Técnicos',
  '/divergencias': 'Divergências', '/historico': 'Histórico',
  '/agendamentos': 'Agendamentos', '/pecas': 'Peças Novas',
  '/pecas-usadas': 'Peças Usadas', '/devolucoes': 'Lotes Montados',
  '/usuarios': 'Usuários', '/cadastro-tecnicos': 'Cadastro Técnicos',
  '/ferramental': 'Ferramental', '/ferramental/dashboard': 'Dashboard Ferramental',
  '/ferramental/estoque': 'Estoque Técnico', '/ferramental/estoque-central': 'Estoque Central',
  '/ferramental/desligamentos': 'Devoluções Ferramental', '/admin/logs': 'Logs de Acesso',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AccessLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs,      setLogs]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [eventType, setEventType] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [from,      setFrom]      = useState('');
  const [to,        setTo]        = useState('');

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') router.replace('/dashboard');
  }, [status, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '500' });
    if (eventType) p.set('event_type', eventType);
    if (userEmail) p.set('user_email', userEmail);
    if (from)      p.set('from', from);
    if (to)        p.set('to', to);
    const res  = await fetch(`/api/admin/access-logs?${p}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [eventType, userEmail, from, to]);

  useEffect(() => { if (session?.user?.role === 'admin') load(); }, [load, session]);

  const uniqueEmails = [...new Set(logs.map(l => l.user_email).filter(Boolean))].sort();

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) return null;

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%', background: 'var(--color-bg-primary)', minHeight: '100vh' }}>
      <PageHeader title="Logs de Acesso" subtitle={`${logs.length} registros`} />

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem', padding: '1.5rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
        <select value={eventType} onChange={e => setEventType(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }}>
          <option value="">Todos os tipos</option>
          <option value="login">Login</option>
          <option value="page_view">Página visitada</option>
          <option value="action">Ação</option>
        </select>

        <select value={userEmail} onChange={e => setUserEmail(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit', minWidth: '200px' }}>
          <option value="">Todos os usuários</option>
          {uniqueEmails.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
          style={{ padding: '0.5rem 0.75rem', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.85rem', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', fontFamily: 'inherit' }} />

        <button onClick={load} style={{ padding: '0.5rem 1rem', background: 'var(--color-accent-cyan)', color: '#000', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 12px rgba(0, 255, 255, 0.4)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none'; }}>Filtrar</button>
        <button onClick={() => { setEventType(''); setUserEmail(''); setFrom(''); setTo(''); }} style={{ padding: '0.5rem 1rem', background: 'transparent', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent-cyan)'; e.currentTarget.style.color = 'var(--color-accent-cyan)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>Limpar</button>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Carregando...</div>
      ) : logs.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Nenhum registro encontrado.</div>
      ) : (
        <div style={{ border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden', background: 'var(--color-bg-secondary)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-primary)', borderBottom: '2px solid var(--color-border-light)' }}>
                {['Data/Hora', 'Usuário', 'Perfil', 'Evento', 'Página / Ação', 'IP', 'Localização'].map(h => (
                  <th key={h} style={{ padding: '1rem 1.5rem', textAlign: 'left', fontWeight: '800', color: 'var(--color-accent-cyan)', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l, i) => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)', transition: 'all 0.2s ease' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-tertiary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? 'var(--color-bg-secondary)' : 'var(--color-bg-primary)'; }}>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.created_at)}</td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <div style={{ fontWeight: '700', color: 'var(--color-text-primary)' }}>{l.user_name || '—'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>{l.user_email}</div>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', background: 'var(--color-bg-tertiary)', padding: '0.25rem 0.5rem', borderRadius: '8px', color: 'var(--color-text-tertiary)', border: '1px solid var(--color-border-light)' }}>
                      {l.user_role || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem' }}>
                    <span style={{
                      display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: '800', textTransform: 'uppercase', whiteSpace: 'nowrap',
                      background: l.event_type === 'login' ? 'var(--color-accent-cyan)' : 'var(--color-bg-tertiary)',
                      color: l.event_type === 'login' ? '#000' : 'var(--color-text-tertiary)',
                    }}>
                      {EVENT_LABELS[l.event_type] || l.event_type}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-secondary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.event_type === 'page_view'
                      ? (PAGE_LABELS[l.page_path] || l.page_path || '—')
                      : (l.action_detail || '—')}
                  </td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{l.ip_address || '—'}</td>
                  <td style={{ padding: '1rem 1.5rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {[l.city, l.country].filter(Boolean).join(', ') || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
