'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

/* ─── Modal de Cadastro/Edição ───────────────────────────── */
function ModalTecnico({ tecnico, onClose, onSaved, isAdmin, isSupervisor, isCoordinator, isAnalyst, supervisores, coordenadores }) {
  const [form, setForm] = useState({
    name:             tecnico?.name             || '',
    email:            tecnico?.email            || '',
    phone:            tecnico?.phone            || '',
    region:           tecnico?.region           || '',
    supervisor_name:  tecnico?.supervisor_name  || '',
    coordinator_name: tecnico?.coordinator_name || '',
    active:           tecnico?.active !== undefined ? tecnico.active : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const canEditAll = isAdmin || isSupervisor || isCoordinator || isAnalyst;

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const url = tecnico ? `/api/technicians/${tecnico.id}` : '/api/technicians';
      const method = tecnico ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');
      onSaved(data);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--color-bg-primary)', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--color-text-primary)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-tertiary)' }}>
          <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
            {tecnico ? 'Editar Técnico' : 'Novo Cadastro de Técnico'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-primary)', fontWeight: '900' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '2px solid var(--color-text-primary)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '800' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Nome completo *">
              <input name="name" value={form.name} onChange={set} required className="input" style={inputStyle} />
            </Field>
            {/* O campo e-mail só é obrigatório se active for true */}
            <Field label={form.active ? "E-mail *" : "E-mail"}>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={set}
                required={form.active}
                className="input"
                placeholder="email@positivo.com.br"
                style={inputStyle}
              />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            {/* O campo telefone só é obrigatório se active for true */}
            <Field label={form.active ? "Telefone (WhatsApp) *" : "Telefone (WhatsApp)"}>
              <input
                name="phone"
                value={form.phone}
                onChange={set}
                required={form.active}
                className="input"
                placeholder="5541999999999"
                style={inputStyle}
              />
            </Field>
            <Field label="Estado">
              <select name="region" value={form.region} onChange={set} className="input" style={inputStyle}>
                <option value="">Selecione</option>
                {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Coordenador">
              <select name="coordinator_name" value={form.coordinator_name} onChange={set} className="input" style={inputStyle} disabled={!canEditAll}>
                <option value="">Selecione um coordenador</option>
                {coordenadores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Supervisor">
              <select name="supervisor_name" value={form.supervisor_name} onChange={set} className="input" style={inputStyle} disabled={!canEditAll}>
                <option value="">Selecione um supervisor</option>
                {supervisores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Field label="Status do Técnico">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={set}
                  id="active-check"
                  disabled={!canEditAll}
                />
                <label htmlFor="active-check" style={{ fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                  {form.active ? 'TÉCNICO ATIVO' : 'TÉCNICO INATIVO'}
                </label>
              </div>
            </Field>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid var(--color-border-light)' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'var(--color-text-primary)', border: 'none', fontWeight: '900' }}>
              {saving ? 'PROCESSANDO...' : tecnico ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR TÉCNICO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal de Edição em Massa ───────────────────────────── */
function ModalEdicaoEmMassa({ selecionados, onClose, onSaved, supervisores, coordenadores, canEditAll }) {
  const [form, setForm] = useState({
    supervisor_name: '',
    coordinator_name: '',
    active: null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (e) => {
    const { name, value } = e.target;
    if (name === 'active') {
      setForm(f => ({ ...f, [name]: e.target.dataset.value === 'true' ? true : e.target.dataset.value === 'false' ? false : null }));
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const updates = {};
      if (form.supervisor_name) updates.supervisor_name = form.supervisor_name;
      if (form.coordinator_name) updates.coordinator_name = form.coordinator_name;
      if (form.active !== null) updates.active = form.active;

      const res = await fetch('/api/technicians/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selecionados, updates }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao processar');
      onSaved(data);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div style={{ background: 'var(--color-bg-primary)', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid var(--color-text-primary)' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid var(--color-text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--color-bg-tertiary)' }}>
          <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--color-text-primary)', textTransform: 'uppercase' }}>
            Editar {selecionados.length} Técnicos
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--color-text-primary)', fontWeight: '900' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '2px solid var(--color-text-primary)', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '800' }}>{error}</div>}

          <Field label="Novo Coordenador">
            <select name="coordinator_name" value={form.coordinator_name} onChange={set} className="input" style={inputStyle}>
              <option value="">Não alterar</option>
              {coordenadores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Novo Supervisor">
            <select name="supervisor_name" value={form.supervisor_name} onChange={set} className="input" style={inputStyle}>
              <option value="">Não alterar</option>
              {supervisores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
          </Field>

          <Field label="Status do Técnico">
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                <input type="radio" name="active" checked={form.active === null} onChange={set} data-value="null" /> Não alterar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                <input type="radio" name="active" checked={form.active === true} onChange={set} data-value="true" /> Ativar
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                <input type="radio" name="active" checked={form.active === false} onChange={set} data-value="false" /> Desativar
              </label>
            </div>
          </Field>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid var(--color-border-light)' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: 'var(--color-text-primary)', border: 'none', fontWeight: '900' }}>
              {saving ? 'PROCESSANDO...' : 'ATUALIZAR EM MASSA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: 'var(--color-text-primary)', marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { border: '1px solid var(--color-text-primary)', borderRadius: '8px', fontWeight: '600', background: 'var(--color-bg-primary)', color: 'var(--color-text-primary)' };
const labelMiniStyle = { display: 'block', fontSize: '0.65rem', fontWeight: '900', color: 'var(--color-text-tertiary)', marginBottom: '0.25rem', textTransform: 'uppercase' };

export default function CadastroTecnicosPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isSupervisor = session?.user?.role === 'supervisor';
  const isCoordinator = session?.user?.role === 'coordinator';
  const isAnalyst = session?.user?.role === 'analyst';

  const [tecnicos,      setTecnicos]      = useState([]);
  const [supervisores,  setSupervisores]  = useState([]);
  const [coordenadores, setCoordenadores] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [regionFlt,     setRegionFlt]     = useState('');
  const [supervisorFlt, setSupervisorFlt] = useState('');
  const [coordinatorFlt, setCoordinatorFlt] = useState('');
  const [modal,         setModal]         = useState(null);
  const [selecionados,  setSelecionados]  = useState([]);
  const [confirmDelete, setConfirmDelete] = useState(null); // id do tecnico aguardando confirmação
  const [deleting,      setDeleting]      = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/users')
        .then(r => r.json())
        .then(data => {
          const users = Array.isArray(data) ? data : [];
          setSupervisores(users.filter(u => u.role === 'supervisor'));
          setCoordenadores(users.filter(u => u.role === 'coordinator'));
        })
        .catch(err => console.error('Erro ao carregar usuários:', err));
    }
  }, [status]);

  const load = useCallback(async () => {
    if (status !== 'authenticated') return;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      if (regionFlt) p.set('region', regionFlt);
      const res = await fetch(`/api/technicians?${p}`);
      const data = await res.json();
      setTecnicos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }, [search, regionFlt, status]);

  useEffect(() => { load(); }, [load]);

  const dynamicFilters = useMemo(() => {
    const states = new Set();
    const sups = new Set();
    const coords = new Set();

    tecnicos.forEach(t => {
      if (t.region) states.add(t.region);
      if (t.supervisor_name) sups.add(t.supervisor_name);
      if (t.coordinator_name) coords.add(t.coordinator_name);
    });

    return {
      states: Array.from(states).sort(),
      supervisors: Array.from(sups).sort(),
      coordinators: Array.from(coords).sort()
    };
  }, [tecnicos]);

  const filteredTecnicos = tecnicos.filter(t => {
    if (supervisorFlt && t.supervisor_name !== supervisorFlt) return false;
    if (coordinatorFlt && t.coordinator_name !== coordinatorFlt) return false;
    return true;
  });

  const toggleSelect = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selecionados.length === filteredTecnicos.length) setSelecionados([]);
    else setSelecionados(filteredTecnicos.map(t => t.id));
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/technicians/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      setConfirmDelete(null);
      load();
      toast.success('Técnico excluído.');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (status === 'loading') return null;

  const canEditAll = isAdmin || isSupervisor || isCoordinator || isAnalyst;

  return (
    <div style={{ padding: '2.5rem 3rem', width: '100%', background: 'var(--color-bg-primary)' }}>
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle="Gerenciamento de técnicos e vínculos de gestão"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {selecionados.length > 0 && (
              <button className="btn btn-secondary" onClick={() => setModal({ type: 'bulk' })} style={{ border: '2px solid var(--color-text-primary)', fontWeight: '800' }}>
                EDITAR SELECIONADOS ({selecionados.length})
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setModal({ type: 'new' })} style={{ background: 'var(--color-text-primary)', border: 'none', fontWeight: '900' }}>
              + NOVO TÉCNICO
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: '2rem', background: 'var(--color-bg-secondary)', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--color-border-light)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label style={labelMiniStyle}>Buscar por nome ou e-mail</label>
            <input type="text" className="input" placeholder="Ex: João Silva..." value={search} onChange={e => setSearch(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelMiniStyle}>Filtrar por UF</label>
            <select className="input" value={regionFlt} onChange={e => setRegionFlt(e.target.value)} style={inputStyle}>
              <option value="">Todas as regiões</option>
              {dynamicFilters.states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={labelMiniStyle}>Filtrar por Coordenador</label>
            <select className="input" value={coordinatorFlt} onChange={e => setCoordinatorFlt(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {dynamicFilters.coordinators.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelMiniStyle}>Filtrar por Supervisor</label>
            <select className="input" value={supervisorFlt} onChange={e => setSupervisorFlt(e.target.value)} style={inputStyle}>
              <option value="">Todos</option>
              {dynamicFilters.supervisors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr style={{ background: 'var(--color-bg-tertiary)' }}>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" checked={selecionados.length > 0 && selecionados.length === filteredTecnicos.length} onChange={toggleAll} />
                </th>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>UF</th>
                <th>Gestão</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando técnicos...</td></tr>
              ) : filteredTecnicos.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Nenhum técnico encontrado</td></tr>
              ) : (
                filteredTecnicos.map(t => (
                  <tr key={t.id} style={{ background: selecionados.includes(t.id) ? '#f0f9ff' : 'transparent' }}>
                    <td><input type="checkbox" checked={selecionados.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                    <td style={{ fontWeight: '800', color: 'var(--color-text-primary)' }}>{t.name}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: '600' }}>{t.email || '—'}</td>
                    <td style={{ fontSize: '0.8rem', fontWeight: '600' }}>{t.phone || '—'}</td>
                    <td><span className="badge badge-info">{t.region || '—'}</span></td>
                    <td>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700' }}>
                        <div style={{ color: 'var(--color-text-primary)' }}>Coord: {t.coordinator_name || '—'}</div>
                        <div style={{ color: 'var(--color-text-tertiary)' }}>Sup: {t.supervisor_name || '—'}</div>
                      </div>
                    </td>
                    <td>
                      {t.active ? (
                        <span className="badge badge-ok">ATIVO</span>
                      ) : (
                        <span className="badge badge-not-ok" style={{ opacity: 0.6 }}>INATIVO</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {confirmDelete === t.id ? (
                          <>
                            <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--color-text-primary)' }}>Confirmar exclusão?</span>
                            <button
                              className="btn"
                              onClick={() => handleDelete(t.id)}
                              disabled={deleting}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: '800', background: 'var(--color-text-primary)', color: 'var(--color-bg-primary)', border: '1px solid var(--color-text-primary)' }}
                            >
                              {deleting ? '...' : 'SIM'}
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setConfirmDelete(null)}
                              disabled={deleting}
                              style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem', fontWeight: '700', border: '1px solid var(--color-border-light)' }}
                            >
                              NÃO
                            </button>
                          </>
                        ) : (
                          <>
                            <button className="btn btn-secondary" onClick={() => setModal({ type: 'edit', data: t })} style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', border: '1px solid var(--color-text-primary)' }}>
                              EDITAR
                            </button>
                            {isAdmin && (
                              <button
                                className="btn btn-secondary"
                                onClick={() => setConfirmDelete(t.id)}
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', border: '1px solid var(--color-border-light)', color: 'var(--color-text-tertiary)' }}
                              >
                                EXCLUIR
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal?.type === 'new' && (
        <ModalTecnico
          onClose={() => setModal(null)}
          onSaved={(d) => { setModal(null); load(); toast.success('Técnico cadastrado!'); }}
          isAdmin={isAdmin} isSupervisor={isSupervisor} isCoordinator={isCoordinator} isAnalyst={isAnalyst}
          supervisores={supervisores} coordenadores={coordenadores}
        />
      )}
      {modal?.type === 'edit' && (
        <ModalTecnico
          tecnico={modal.data}
          onClose={() => setModal(null)}
          onSaved={(d) => { setModal(null); load(); toast.success('Cadastro atualizado!'); }}
          isAdmin={isAdmin} isSupervisor={isSupervisor} isCoordinator={isCoordinator} isAnalyst={isAnalyst}
          supervisores={supervisores} coordenadores={coordenadores}
        />
      )}
      {modal?.type === 'bulk' && (
        <ModalEdicaoEmMassa
          selecionados={selecionados}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); setSelecionados([]); load(); toast.success('Técnicos atualizados!'); }}
          supervisores={supervisores} coordenadores={coordenadores}
          canEditAll={canEditAll}
        />
      )}
    </div>
  );
}
