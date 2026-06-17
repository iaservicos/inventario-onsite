'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import * as XLSX from 'xlsx';

const EVENT_LABELS = {
  login:     'Login',
  page_view: 'Página visitada',
  action:    'Ação',
};

const EVENT_COLORS = {
  login:     { bg: '#000', color: '#fff' },
  page_view: { bg: '#f0f0f0', color: '#333' },
  action:    { bg: '#e0e0e0', color: '#000' },
};

const PAGE_LABELS = {
  '/dashboard':                   'Dashboard Inventário',
  '/tecnicos':                    'Técnicos',
  '/divergencias':                'Divergências',
  '/historico':                   'Histórico',
  '/agendamentos':                'Agendamentos',
  '/pecas':                       'Peças Novas',
  '/pecas-usadas':                'Peças Usadas',
  '/devolucoes':                  'Lotes Montados',
  '/usuarios':                    'Usuários',
  '/cadastro-tecnicos':           'Cadastro Técnicos',
  '/ferramental':                 'Ferramental',
  '/ferramental/dashboard':       'Dashboard Ferramental',
  '/ferramental/estoque':         'Estoque por Técnico',
  '/ferramental/estoque-central': 'Estoque Central',
  '/ferramental/desligamentos':   'Devoluções Ferramental',
  '/admin/logs':                  'Logs de Acesso',
};

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function EventBadge({ type }) {
  const cfg = EVENT_COLORS[type] || { bg: '#eee', color: '#333' };
  return (
    <span style={{ display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
      {EVENT_LABELS[type] || type}
    </span>
  );
}

function pageLabel(path) {
  if (!path) return '—';
  return PAGE_LABELS[path] || path;
}

export default function AccessLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [logs,       setLogs]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [eventType,  setEventType]  = useState('');
  const [userEmail,  setUserEmail]  = useState('');
  const [from,       setFrom]       = useState('');
  const [to,         setTo]         = useState('');
  const [exporting,  setExporting]  = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [status, session, router]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ limit: '500' });
    if (eventType) params.set('event_type', eventType);
    if (userEmail) params.set('user_email', userEmail);
    if (from)      params.set('from', from);
    if (to)        params.set('to', to);
    const res  = await fetch(`/api/admin/access-logs?${params}`);
    const data = await res.json();
    setLogs(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [eventType, userEmail, from, to]);

  useEffect(() => { if (session?.user?.role === 'admin') load(); }, [load, session]);

  // KPIs
  const logins    = logs.filter(l => l.event_type === 'login').length;
  const pageViews = logs.filter(l => l.event_type === 'page_view').length;
  const actions   = logs.filter(l => l.event_type === 'action').length;
  const uniqueUsers = new Set(logs.map(l => l.user_email).filter(Boolean)).size;

  const uniqueEmails = [...new Set(logs.map(l => l.user_email).filter(Boolean))].sort();

  function handleExport() {
    setExporting(true);
    const rows = logs.map(l => ({
      'Data/Hora':      fmt(l.created_at),
      'Usuário':        l.user_name || '',
      'E-mail':         l.user_email || '',
      'Perfil':         l.user_role || '',
      'Evento':         EVENT_LABELS[l.event_type] || l.event_type,
      'Página':         pageLabel(l.page_path),
      'Detalhe':        l.action_detail || '',
      'IP':             l.ip_address || '',
      'Cidade':         l.city || '',
      'Região':         l.region || '',
      'País':           l.country || '',
      'Navegador':      l.user_agent || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [16, 20, 28, 12, 14, 22, 22, 15, 16, 12, 6, 40].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Logs');
    XLSX.writeFile(wb, `logs-acesso-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setExporting(false);
  }

  if (status === 'loading' || (status === 'authenticated' && session?.user?.role !== 'admin')) {
    return null;
  }

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Logs de Acesso"
        subtitle="Registro de logins, páginas visitadas e ações realizadas"
        actions={
          <button className="btn btn-secondary" onClick={handleExport} disabled={exporting || logs.length === 0}>
            {exporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        }
      />

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total de eventos', value: logs.length },
          { label: 'Logins',           value: logins },
          { label: 'Páginas visitadas',value: pageViews },
          { label: 'Ações',            value: actions },
          { label: 'Usuários únicos',  value: uniqueUsers },
        ].map(k => (
          <div key={k.label} className="card">
            <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#000', lineHeight: 1 }}>{k.value}</div>
            <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#888', marginTop: '0.4rem', textTransform: 'uppercase' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>Tipo</div>
          <select value={eventType} onChange={e => setEventType(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem', background: '#fff', minWidth: '160px' }}>
            <option value="">Todos</option>
            <option value="login">Login</option>
            <option value="page_view">Página visitada</option>
            <option value="action">Ação</option>
          </select>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>Usuário</div>
          <select value={userEmail} onChange={e => setUserEmail(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem', background: '#fff', minWidth: '220px' }}>
            <option value="">Todos</option>
            {uniqueEmails.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>De</div>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem' }} />
        </div>

        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', color: '#888', marginBottom: '0.3rem' }}>Até</div>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontSize: '0.82rem' }} />
        </div>

        <button className="btn btn-primary" onClick={load} style={{ alignSelf: 'flex-end' }}>Filtrar</button>
        <button className="btn btn-secondary" onClick={() => { setEventType(''); setUserEmail(''); setFrom(''); setTo(''); }} style={{ alignSelf: 'flex-end' }}>Limpar</button>
      </div>

      {/* Tabela */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Carregando...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: '#888', fontWeight: '700' }}>Nenhum log encontrado.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.79rem' }}>
              <thead>
                <tr style={{ background: '#f4f4f5', borderBottom: '2px solid #eee' }}>
                  {['Data/Hora', 'Usuário', 'Perfil', 'Evento', 'Página / Ação', 'IP', 'Localização'].map(h => (
                    <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: '800', color: '#333', textTransform: 'uppercase', fontSize: '0.65rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((l, i) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '0.6rem 1rem', color: '#555', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{fmt(l.created_at)}</td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: '#000' }}>{l.user_name || '—'}</div>
                      <div style={{ fontSize: '0.7rem', color: '#888' }}>{l.user_email}</div>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: '#555' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', background: '#f0f0f0', padding: '0.15rem 0.4rem', borderRadius: '3px' }}>
                        {l.user_role || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}><EventBadge type={l.event_type} /></td>
                    <td style={{ padding: '0.6rem 1rem', color: '#333', maxWidth: '240px' }}>
                      {l.event_type === 'page_view' ? (
                        <span title={l.page_path}>{pageLabel(l.page_path)}</span>
                      ) : l.action_detail ? (
                        <span>{l.action_detail}</span>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: '#888', whiteSpace: 'nowrap', fontFamily: 'monospace', fontSize: '0.72rem' }}>{l.ip_address || '—'}</td>
                    <td style={{ padding: '0.6rem 1rem', color: '#555', whiteSpace: 'nowrap' }}>
                      {l.city || l.country
                        ? [l.city, l.region, l.country].filter(Boolean).join(', ')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div style={{ textAlign: 'right', fontSize: '0.72rem', color: '#aaa', marginTop: '0.5rem', fontWeight: '600' }}>
          Exibindo {logs.length} registros (máx. 500)
        </div>
      )}
    </div>
  );
}
