'use client';

import { useState, useEffect } from 'react';
import FilterBar from '@/components/ui/FilterBar';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';

const FLOW_STEPS = [
  { id: 1, label: 'Power Automate dispara inventário', source: 'power_automate', icon: '⚡' },
  { id: 2, label: 'Dispara.AI envia mensagem WhatsApp', source: 'dispara_ai', icon: '💬' },
  { id: 3, label: 'Técnico inicia contagem', source: 'system', icon: '📋' },
  { id: 4, label: 'Itens contados e registrados', source: 'system', icon: '✓' },
  { id: 5, label: 'Power Automate detecta divergências', source: 'power_automate', icon: '⚡' },
  { id: 6, label: 'Dispara.AI solicita recontagem', source: 'dispara_ai', icon: '💬' },
  { id: 7, label: 'Inventário concluído e validado', source: 'system', icon: '✅' },
];

export default function SimulacaoPage() {
  const [filters, setFilters] = useState({ from: '', to: '', technicianId: '', status: '' });
  const [technicians, setTechnicians] = useState([]);
  const [form, setForm] = useState({ technician_id: '', week_ref: '', total_items: 10 });
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch('/api/technicians').then((r) => r.json()).then((data) => {
      setTechnicians(data);
      if (data.length > 0) setForm((f) => ({ ...f, technician_id: data[0].id }));
    });
  }, []);

  async function runSimulation() {
    if (!form.technician_id) { toast.error('Selecione um técnico'); return; }
    if (!form.week_ref) { toast.error('Informe a semana de referência'); return; }

    setRunning(true);
    setCurrentStep(0);
    setCompletedSteps([]);
    setResult(null);

    try {
      const res = await fetch('/api/inventories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const inv = await res.json();

      for (let i = 0; i < FLOW_STEPS.length; i++) {
        setCurrentStep(i);
        await sleep(900);
        setCompletedSteps((prev) => [...prev, i]);
      }

      setResult(inv);
      toast.success('Simulação concluída com sucesso!');
    } catch {
      toast.error('Erro na simulação');
    }

    setRunning(false);
    setCurrentStep(-1);
  }

  async function loadSeed() {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        toast.success('Dados de demonstração carregados!');
      } else {
        toast.error(json.error || 'Erro ao carregar dados');
      }
    } catch {
      toast.error('Erro ao carregar dados de demonstração');
    }
    setSeeding(false);
  }

  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

  const weekRef = `S${String(new Date().getWeek()).padStart(2, '0')}-${new Date().getFullYear()}`;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1000px' }}>
      <PageHeader
        title="Simulação"
        subtitle="Demonstração do fluxo completo de inventário"
        actions={
          <button className="btn btn-secondary" onClick={loadSeed} disabled={seeding}>
            {seeding ? 'Carregando...' : 'Carregar Dados Demo'}
          </button>
        }
      />

      <FilterBar filters={filters} onChange={setFilters} technicians={technicians} />

      <div style={{ height: '1.5rem' }} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <div className="card">
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Criar Inventário Simulado</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Técnico
              </label>
              <select
                className="input"
                value={form.technician_id}
                onChange={(e) => setForm({ ...form, technician_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} — {t.region}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Semana de Referência
              </label>
              <input
                className="input"
                value={form.week_ref}
                onChange={(e) => setForm({ ...form, week_ref: e.target.value })}
                placeholder={`ex: S01-2026`}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#94a3b8', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Total de Itens
              </label>
              <input
                type="number"
                className="input"
                min={1}
                max={500}
                value={form.total_items}
                onChange={(e) => setForm({ ...form, total_items: Number(e.target.value) })}
              />
            </div>

            <button
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
              onClick={runSimulation}
              disabled={running}
            >
              {running ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Simulando...
                </>
              ) : (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  Iniciar Simulação
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Fluxo de Execução</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FLOW_STEPS.map((step, i) => {
              const done = completedSteps.includes(i);
              const active = currentStep === i;
              const sourceColor = { power_automate: '#0078d4', dispara_ai: '#7c3aed', system: '#10b981' }[step.source];

              return (
                <div
                  key={step.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.625rem 0.875rem',
                    borderRadius: '8px',
                    background: done ? 'rgba(16,185,129,0.06)' : active ? 'rgba(0,212,255,0.06)' : '#0a1628',
                    border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : active ? 'rgba(0,212,255,0.2)' : '#1e3a6e'}`,
                    transition: 'all 0.3s',
                  }}
                >
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? '#10b981' : active ? '#00d4ff' : '#1e3a6e', flexShrink: 0, fontSize: '0.75rem', fontWeight: '700', color: done || active ? '#050d1a' : '#64748b' }}>
                    {done ? '✓' : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', color: done ? '#10b981' : active ? '#00d4ff' : '#94a3b8' }}>{step.label}</div>
                    <div style={{ fontSize: '0.65rem', color: sourceColor, marginTop: '1px' }}>
                      {{ power_automate: 'Power Automate', dispara_ai: 'Dispara.AI', system: 'Sistema' }[step.source]}
                    </div>
                  </div>
                  {active && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="2" style={{ animation: 'spin 1s linear infinite', flexShrink: 0 }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                  )}
                </div>
              );
            })}
          </div>

          {result && (
            <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: '600', color: '#10b981', marginBottom: '0.25rem' }}>Inventário criado com sucesso</div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>ID: #{result.id} · Status: Pendente</div>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem' }} className="card">
        <div className="section-title" style={{ marginBottom: '1rem' }}>Sobre o Fluxo</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <FlowInfo
            title="Power Automate"
            color="#0078d4"
            items={['Dispara inventários semanais', 'Monitora status e timeouts', 'Detecta divergências', 'Gera alertas de abandono']}
          />
          <FlowInfo
            title="Dispara.AI"
            color="#7c3aed"
            items={['Envia mensagens WhatsApp', 'Coleta respostas dos técnicos', 'Solicita recontagens', 'Envia alertas ao supervisor']}
          />
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

function FlowInfo({ title, color, items }) {
  return (
    <div style={{ padding: '1rem', background: '#0a1628', borderRadius: '8px', border: '1px solid #1e3a6e' }}>
      <div style={{ fontSize: '0.875rem', fontWeight: '600', color, marginBottom: '0.625rem' }}>{title}</div>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.375rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            <span style={{ color, marginTop: '1px' }}>›</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

Date.prototype.getWeek = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
};
