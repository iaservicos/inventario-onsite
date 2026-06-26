'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { formatDate } from '@/lib/utils';

const STATUS_CONFIG = {
  aguardando_aprovacao: { label: 'Aguard. Aprovação', color: 'var(--color-text-primary)', bg: 'var(--color-bg-tertiary)' },
  aprovado:             { label: 'Aprovado',           color: 'var(--color-text-primary)', bg: 'var(--color-border-light)' },
  reprovado:            { label: 'Reprovado',          color: 'var(--color-bg-primary)', bg: 'var(--color-text-primary)' },
  aguardando_envio:     { label: 'Aguard. Envio',      color: 'var(--color-text-primary)', bg: 'var(--color-border-light)' },
  enviando:             { label: 'Enviando',           color: 'var(--color-text-primary)', bg: 'var(--color-border-light)' },
  pendente:             { label: 'Pendente',           color: 'var(--color-text-primary)', bg: 'var(--color-bg-tertiary)' },
  aguardando_compra:    { label: 'Aguard. Compra',     color: 'var(--color-text-primary)', bg: 'var(--color-border-light)' },
  cancelado:            { label: 'Cancelado',          color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-tertiary)' },
  entregue:             { label: 'Entregue',           color: 'var(--color-bg-primary)', bg: 'var(--color-text-secondary)' },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--color-text-tertiary)', bg: 'var(--color-bg-secondary)' };
  return (
    <span style={{ padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.68rem', fontWeight: '800', color: cfg.color, background: cfg.bg, whiteSpace: 'nowrap' }}>
      {cfg.label}
    </span>
  );
}

function KpiCard({ label, value, sub, href }) {
  const inner = (
    <div className="card" style={{ height: '100%' }}>
      <div style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--color-text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-tertiary)', marginTop: '0.4rem', textTransform: 'uppercase' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
  if (href) return <Link href={href} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>;
  return inner;
}

export default function FerramentalDashboardPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState([]);
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, stockRes] = await Promise.all([
        fetch('/api/ferramental/requests'),
        fetch('/api/ferramental/central-stock'),
      ]);
      const [reqData, stockData] = await Promise.all([reqRes.json(), stockRes.json()]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setStock(Array.isArray(stockData) ? stockData : []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const total          = requests.length;
  const aguardando     = requests.filter(r => r.status === 'aguardando_aprovacao').length;
  const emAndamento    = requests.filter(r => ['aprovado', 'aguardando_envio', 'enviando', 'pendente'].includes(r.status)).length;
  const entregues      = requests.filter(r => r.status === 'entregue').length;
  const aguardaCompra  = requests.filter(r => r.status === 'aguardando_compra').length;

  const totalItensEstoque = stock.reduce((s, t) => s + t.branches.reduce((ss, b) => ss + b.quantity, 0), 0);
  const ferramentasSemEstoque = stock.filter(t => t.branches.every(b => b.quantity === 0) || t.branches.length === 0).length;

  const byStatus = Object.entries(
    requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]);

  const recentes = [...requests]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <DashboardLayout
      title={`${greeting}, ${session?.user?.name?.split(' ')[0] || 'Analista'}`}
      subtitle="Dashboard Ferramental — visão geral das solicitações e estoque"
    >

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-text-tertiary)', fontWeight: '700' }}>Carregando...</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '1.75rem' }}>
            <KpiCard label="Total de Solicitações" value={total} href="/ferramental" />
            <KpiCard label="Aguardando Aprovação" value={aguardando} sub="ação do gestor" href="/ferramental?status=aguardando_aprovacao" />
            <KpiCard label="Em Andamento" value={emAndamento} sub="aprovadas / enviando" href="/ferramental" />
            <KpiCard label="Entregues" value={entregues} href="/ferramental?status=entregue" />
            <KpiCard label="Aguard. Compra" value={aguardaCompra} href="/ferramental?status=aguardando_compra" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.75rem' }}>

            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>Por Status</span>
                <Link href="/ferramental" style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textDecoration: 'none', fontWeight: '700' }}>Ver tudo →</Link>
              </div>
              {byStatus.length === 0 ? (
                <div style={{ color: 'var(--color-text-tertiary)', fontSize: '0.82rem', textAlign: 'center', padding: '1.5rem' }}>Sem dados</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {byStatus.map(([status, count]) => {
                    const cfg = STATUS_CONFIG[status] || { label: status, color: 'var(--color-text-tertiary)', bg: '#f3f4f6' };
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={status}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--color-text-secondary)' }}>{cfg.label}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-primary)' }}>{count}</span>
                        </div>
                        <div style={{ height: '4px', borderRadius: '4px', background: 'var(--color-bg-tertiary)', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-text-primary)', borderRadius: '4px', transition: 'width 0.4s' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>Estoque Central</span>
                <Link href="/ferramental/estoque-central" style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textDecoration: 'none', fontWeight: '700' }}>Gerenciar →</Link>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-text-primary)' }}>{totalItensEstoque}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginTop: '0.2rem', textTransform: 'uppercase' }}>Itens em estoque</div>
                </div>
                <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--color-text-primary)' }}>{ferramentasSemEstoque}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-tertiary)', fontWeight: '700', marginTop: '0.2rem', textTransform: 'uppercase' }}>Ferramentas sem estoque</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {stock.filter(t => t.branches.some(b => b.quantity > 0)).slice(0, 4).map(tool => {
                  const qty = tool.branches.reduce((s, b) => s + b.quantity, 0);
                  return (
                    <div key={tool.tool_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0', borderBottom: '1px solid var(--color-bg-tertiary)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: '600', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.5rem' }}>{tool.tool_name}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--color-text-primary)', flexShrink: 0 }}>{qty} un.</span>
                    </div>
                  );
                })}
                {stock.filter(t => t.branches.some(b => b.quantity > 0)).length === 0 && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-text-tertiary)', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>Nenhum estoque registrado</div>
                )}
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--color-bg-primary)', border: '1px solid var(--color-border-light)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '900', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>Últimas Solicitações</span>
              <Link href="/ferramental" style={{ fontSize: '0.72rem', color: 'var(--color-text-tertiary)', textDecoration: 'none', fontWeight: '700' }}>Ver todas →</Link>
            </div>
            {recentes.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-tertiary)', fontSize: '0.85rem' }}>Nenhuma solicitação ainda.</div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                      {['#', 'Técnico', 'Ferramenta', 'Status', 'Data'].map(h => (
                        <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.68rem', fontWeight: '800', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', borderBottom: '1px solid var(--color-border-light)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentes.map((r, i) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--color-border-light)', background: i % 2 === 0 ? 'var(--color-bg-primary)' : 'var(--color-bg-secondary)' }}>
                        <td style={{ padding: '0.65rem 1rem', color: '#aaaaaa', fontWeight: '700' }}>#{r.id}</td>
                        <td style={{ padding: '0.65rem 1rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>{r.technician_name}</td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--color-text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.tool_name}</td>
                        <td style={{ padding: '0.65rem 1rem' }}><StatusPill status={r.status} /></td>
                        <td style={{ padding: '0.65rem 1rem', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap', fontSize: '0.75rem' }}>{formatDate(r.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginTop: '1.5rem' }}>
            {[
              { href: '/ferramental', label: 'Solicitações', desc: 'Aprovar e atualizar status' },
              { href: '/ferramental/estoque', label: 'Estoque por Técnico', desc: 'Ferramentas em posse' },
              { href: '/ferramental/estoque-central', label: 'Estoque Central', desc: 'Filiais e localizações' },
              { href: '/cadastro-tecnicos', label: 'Cadastro Técnicos', desc: 'Gerenciar técnicos' },
            ].map(link => (
              <Link key={link.href} href={link.href} style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-light)', borderRadius: '8px', padding: '1rem', textDecoration: 'none', display: 'block', transition: 'all 0.2s', cursor: 'pointer' }}>
                <div style={{ fontWeight: '800', fontSize: '0.82rem', color: 'var(--color-text-primary)' }}>{link.label}</div>
                <div style={{ fontSize: '0.72rem', color: '#aaaaaa', marginTop: '0.2rem' }}>{link.desc}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
