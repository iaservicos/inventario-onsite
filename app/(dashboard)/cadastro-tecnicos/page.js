'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

/* ─── Modal de Cadastro/Edição ───────────────────────────── */
function ModalTecnico({ tecnico, onClose, onSaved, isAdmin, isSupervisor, isCoordinator, supervisores, coordenadores }) {
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

  // Agora todos os perfis de gestão podem editar tudo
  const canEditAll = isAdmin || isSupervisor || isCoordinator;

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000000' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' }}>
          <span style={{ fontSize: '1rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>
            {tecnico ? 'Editar Técnico' : 'Novo Cadastro de Técnico'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#000000', fontWeight: '900' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', background: '#fafafa', color: '#000000', border: '2px solid #000000', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '800' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Nome completo *">
              <input name="name" value={form.name} onChange={set} required className="input" style={inputStyle} />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" value={form.email} onChange={set} className="input" placeholder="email@positivo.com.br" style={inputStyle} />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Telefone (WhatsApp)">
              <input name="phone" value={form.phone} onChange={set} className="input" placeholder="5541999999999" style={inputStyle} />
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
                <input type="checkbox" name="active" checked={form.active} onChange={set} id="active-check" disabled={!canEditAll} />
                <label htmlFor="active-check" style={{ fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                  {form.active ? 'TÉCNICO ATIVO' : 'TÉCNICO INATIVO'}
                </label>
              </div>
            </Field>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid #e4e4e7' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000000' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' }}>
          <span style={{ fontSize: '1rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>
            Editar {selecionados.length} Técnicos
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#000000', fontWeight: '900' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', background: '#fafafa', color: '#000000', border: '2px solid #000000', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '800' }}>{error}</div>}

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
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid #e4e4e7' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
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
      <label style={{ block: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#000000', marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { border: '1px solid #000000', borderRadius: '4px', fontWeight: '600' };
const labelMiniStyle = { display: 'block', fontSize: '0.65rem', fontWeight: '900', color: '#71717a', marginBottom: '0.25rem', textTransform: 'uppercase' };

export default function CadastroTecnicosPage() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'admin';
  const isSupervisor = session?.user?.role === 'supervisor';
  const isCoordinator = session?.user?.role === 'coordinator';

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

  const filteredTecnicos = tecnicos.filter(t => {
    if (supervisorFlt && t.supervisor_name !== supervisorFlt) return false;
    if (coordinatorFlt && t.coordinator_name !== coordinatorFlt) return false;
    return true;
  });

  if (status === 'loading') return null;

  const canEditAll = isAdmin || isSupervisor || isCoordinator;

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle="Gerenciamento da base de técnicos e controle de acesso"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {selecionados.length > 0 && canEditAll && (
              <button className="btn btn-secondary" onClick={() => setModal({ type: 'bulk', data: null })} style={{ border: '2px solid #000000', fontWeight: '900' }}>
                EDITAR {selecionados.length} SELECIONADOS
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setModal({ type: 'new', data: null })} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
              + NOVO TÉCNICO
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'flex-end', border: '1px solid #e4e4e7' }}>
        <div>
          <label style={labelMiniStyle}>Busca</label>
          <input type="text" placeholder="Nome ou e-mail..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={inputStyle} />
        </div>
        <div>
          <label style={labelMiniStyle}>Região</label>
          <select value={regionFlt} onChange={e => setRegionFlt(e.target.value)} className="input" style={inputStyle}>
            <option value="">Todas</option>
            {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label style={labelMiniStyle}>Coordenador</label>
          <select value={coordinatorFlt} onChange={e => setCoordinatorFlt(e.target.value)} className="input" style={inputStyle}>
            <option value="">Todos</option>
            {coordenadores.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label style={labelMiniStyle}>Supervisor</label>
          <select value={supervisorFlt} onChange={e => setSupervisorFlt(e.target.value)} className="input" style={inputStyle}>
            <option value="">Todos</option>
            {supervisores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr style={{ background: '#f4f4f5' }}>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={(e) => setSelecionados(e.target.checked ? filteredTecnicos.map(t => t.id) : [])} checked={selecionados.length === filteredTecnicos.length && filteredTecnicos.length > 0} />
                </th>
                <th>Técnico</th>
                <th>Região</th>
                <th>Coordenador</th>
                <th>Supervisor</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', fontWeight: '800' }}>CARREGANDO...</td></tr>
              ) : filteredTecnicos.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', fontWeight: '800' }}>NENHUM TÉCNICO ENCONTRADO</td></tr>
              ) : (
                filteredTecnicos.map(t => (
                  <tr key={t.id}>
                    <td><input type="checkbox" checked={selecionados.includes(t.id)} onChange={() => setSelecionados(prev => prev.includes(t.id) ? prev.filter(i => i !== t.id) : [...prev, t.id])} /></td>
                    <td>
                      <div style={{ fontWeight: '800', color: '#000000' }}>{t.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#71717a' }}>{t.email}</div>
                    </td>
                    <td><span className="badge" style={{ background: '#f4f4f5', border: '1px solid #000000', color: '#000000', fontWeight: '800' }}>{t.region || 'N/A'}</span></td>
                    <td style={{ fontWeight: '600' }}>{t.coordinator_name || '-'}</td>
                    <td style={{ fontWeight: '600' }}>{t.supervisor_name || '-'}</td>
                    <td>
                      <span className="badge" style={{ background: t.active ? '#000000' : '#ffffff', color: t.active ? '#ffffff' : '#000000', border: '1px solid #000000', fontWeight: '800' }}>
                        {t.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontWeight: '800', border: '1px solid #000000' }} onClick={() => setModal({ type: 'edit', data: t })}>
                        EDITAR
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && modal.type === 'bulk' ? (
        <ModalEdicaoEmMassa selecionados={selecionados} onClose={() => setModal(null)} onSaved={() => { setModal(null); setSelecionados([]); load(); }} supervisores={supervisores} coordenadores={coordenadores} canEditAll={canEditAll} />
      ) : modal && (
        <ModalTecnico tecnico={modal.data} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} isAdmin={isAdmin} isSupervisor={isSupervisor} isCoordinator={isCoordinator} supervisores={supervisores} coordenadores={coordenadores} />
      )}
    </div>
  );
}
