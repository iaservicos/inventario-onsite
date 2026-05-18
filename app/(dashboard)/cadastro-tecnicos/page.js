'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

/* ─── Modal de Cadastro/Edição ───────────────────────────── */
function ModalTecnico({ tecnico, onClose, onSaved, isAdmin, supervisores }) {
  const [form, setForm] = useState({
    name:            tecnico?.name            || '',
    email:           tecnico?.email           || '',
    phone:           tecnico?.phone           || '',
    region:          tecnico?.region          || '',
    supervisor_name: tecnico?.supervisor_name || '',
    active:          tecnico?.active !== undefined ? tecnico.active : true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [newSupervisor, setNewSupervisor] = useState(false);

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
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={modalContentStyle} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>{tecnico ? 'Editar Técnico' : 'Novo Cadastro de Técnico'}</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={errorStyle}>{error}</div>}

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
            <Field label="Supervisor">
              {!newSupervisor ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    name="supervisor_name" 
                    value={form.supervisor_name} 
                    onChange={set} 
                    className="input" 
                    style={inputStyle}
                    disabled={!isAdmin}
                  >
                    <option value="">Selecione Supervisor</option>
                    {supervisores.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {isAdmin && <button type="button" onClick={() => setNewSupervisor(true)} style={miniBtnStyle}>NOVO</button>}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    name="supervisor_name" 
                    value={form.supervisor_name} 
                    onChange={set} 
                    className="input" 
                    placeholder="Nome do novo supervisor" 
                    style={inputStyle}
                  />
                  <button type="button" onClick={() => setNewSupervisor(false)} style={miniBtnStyle}>LISTA</button>
                </div>
              )}
            </Field>
            <Field label="Status do Técnico">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                <input 
                  type="checkbox" 
                  name="active" 
                  checked={form.active} 
                  onChange={set} 
                  id="active-check"
                  disabled={!isAdmin}
                />
                <label htmlFor="active-check" style={{ fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                  {form.active ? 'TÉCNICO ATIVO' : 'TÉCNICO INATIVO'}
                </label>
              </div>
            </Field>
          </div>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>CANCELAR</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
              {saving ? 'PROCESSANDO...' : 'CONFIRMAR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Edição em Massa ──────────────────────────────── */
function ModalMassa({ selecionados, onClose, onSaved, supervisores }) {
  const [form, setForm] = useState({
    supervisor_name: '',
    active: 'keep', // 'keep', 'true', 'false'
  });
  const [saving, setSaving] = useState(false);
  const [newSupervisor, setNewSupervisor] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updateData = {};
      if (form.supervisor_name) updateData.supervisor_name = form.supervisor_name;
      if (form.active !== 'keep') updateData.active = form.active === 'true';

      const promises = selecionados.map(id => 
        fetch(`/api/technicians/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        })
      );
      await Promise.all(promises);
      onSaved();
    } catch (err) { alert('Erro ao atualizar em massa'); }
    finally { setSaving(false); }
  };

  return (
    <div style={modalOverlayStyle} onClick={onClose}>
      <div style={{ ...modalContentStyle, maxWidth: '450px' }} onClick={e => e.stopPropagation()}>
        <div style={modalHeaderStyle}>
          <span style={modalTitleStyle}>Editar {selecionados.length} Técnicos</span>
          <button onClick={onClose} style={closeBtnStyle}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <Field label="Alterar Supervisor">
            {!newSupervisor ? (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select 
                  value={form.supervisor_name} 
                  onChange={e => setForm({...form, supervisor_name: e.target.value})} 
                  className="input" 
                  style={inputStyle}
                >
                  <option value="">Manter Atual</option>
                  {supervisores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button type="button" onClick={() => setNewSupervisor(true)} style={miniBtnStyle}>NOVO</button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  value={form.supervisor_name} 
                  onChange={e => setForm({...form, supervisor_name: e.target.value})} 
                  className="input" 
                  placeholder="Nome do novo supervisor" 
                  style={inputStyle}
                />
                <button type="button" onClick={() => setNewSupervisor(false)} style={miniBtnStyle}>LISTA</button>
              </div>
            )}
          </Field>

          <Field label="Alterar Status">
            <select 
              value={form.active} 
              onChange={e => setForm({...form, active: e.target.value})} 
              className="input" 
              style={inputStyle}
            >
              <option value="keep">Manter Atual</option>
              <option value="true">Ativar Todos</option>
              <option value="false">Inativar Todos</option>
            </select>
          </Field>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>CANCELAR</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
              {saving ? 'ATUALIZANDO...' : 'CONFIRMAR ALTERAÇÃO'}
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
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#000000', marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

export default function CadastroTecnicosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [tecnicos,      setTecnicos]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [regionFlt,     setRegionFlt]     = useState('');
  const [supervisorFlt, setSupervisorFlt] = useState('');
  const [showInactive,  setShowInactive]  = useState(false);
  const [modal,         setModal]         = useState(null); 
  const [showMassa,     setShowMassa]     = useState(false);
  const [selecionados,  setSelecionados]  = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)        p.set('search', search);
      if (regionFlt)     p.set('region', regionFlt);
      p.set('active', showInactive ? 'false' : 'true');
      
      const res  = await fetch(`/api/technicians?${p}`);
      const data = await res.json();
      setTecnicos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao carregar técnicos:', err);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }, [search, regionFlt, showInactive]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const regioes = [...new Set(tecnicos.map(t => t.region).filter(Boolean))].sort();
  const supervisores = [...new Set(tecnicos.map(t => t.supervisor_name).filter(Boolean))].sort();

  const filteredTecnicos = tecnicos.filter(t => {
    if (supervisorFlt && t.supervisor_name !== supervisorFlt) return false;
    return true;
  });

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle="Gerenciamento da base de técnicos e controle de acesso"
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {selecionados.length > 0 && isAdmin && (
              <button className="btn btn-secondary" onClick={() => setShowMassa(true)} style={{ border: '2px solid #000000', fontWeight: '900' }}>
                EDITAR {selecionados.length} EM MASSA
              </button>
            )}
            <button className="btn btn-primary" onClick={() => setModal({ type: 'new', data: null })} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
              + NOVO TÉCNICO
            </button>
          </div>
        }
      />

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #e4e4e7' }}>
        <div style={{ flex: 1 }}>
          <label style={labelMiniStyle}>Busca</label>
          <input
            type="text"
            placeholder="Nome do técnico..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={inputStyle}
          />
        </div>
        <div style={{ width: '180px' }}>
          <label style={labelMiniStyle}>Estado</label>
          <select value={regionFlt} onChange={e => setRegionFlt(e.target.value)} className="input" style={inputStyle}>
            <option value="">Todos</option>
            {regioes.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ width: '200px' }}>
          <label style={labelMiniStyle}>Supervisor</label>
          <select value={supervisorFlt} onChange={e => setSupervisorFlt(e.target.value)} className="input" style={inputStyle}>
            <option value="">Todos os Supervisores</option>
            {supervisores.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ paddingTop: '1.2rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', fontWeight: '900', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            MOSTRAR INATIVOS
          </label>
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr style={{ background: '#f4f4f5' }}>
                <th style={{ width: '40px' }}>
                  <input 
                    type="checkbox" 
                    onChange={e => setSelecionados(e.target.checked ? filteredTecnicos.map(t => t.id) : [])} 
                    checked={selecionados.length === filteredTecnicos.length && filteredTecnicos.length > 0} 
                  />
                </th>
                <th>Nome</th>
                <th>UF</th>
                <th>Telefone</th>
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
                  <tr key={t.id} style={{ opacity: t.active ? 1 : 0.6 }}>
                    <td><input type="checkbox" checked={selecionados.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                    <td style={{ fontWeight: '800', color: '#000000' }}>{t.name}</td>
                    <td><span className="badge badge-info">{t.region || '—'}</span></td>
                    <td style={{ fontWeight: '600' }}>{t.phone || '—'}</td>
                    <td style={{ fontWeight: '800', color: '#000000' }}>{t.supervisor_name || '—'}</td>
                    <td>
                      <span className={`badge ${t.active ? 'badge-ok' : 'badge-not-ok'}`}>
                        {t.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontWeight: '900', border: '1px solid #000000' }} onClick={() => setModal({ type: 'edit', data: t })}>EDITAR</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalTecnico 
          tecnico={modal.data} 
          isAdmin={isAdmin}
          supervisores={supervisores}
          onClose={() => setModal(null)} 
          onSaved={() => { load(); setModal(null); }} 
        />
      )}

      {showMassa && (
        <ModalMassa 
          selecionados={selecionados} 
          supervisores={supervisores}
          onClose={() => setShowMassa(false)} 
          onSaved={() => { load(); setShowMassa(false); setSelecionados([]); }} 
        />
      )}
    </div>
  );
}

const labelMiniStyle = { display: 'block', fontSize: '0.65rem', fontWeight: '900', color: '#71717a', marginBottom: '0.25rem', textTransform: 'uppercase' };
const inputStyle = { border: '1px solid #000000', borderRadius: '4px', fontWeight: '600' };
const modalOverlayStyle = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' };
const modalContentStyle = { background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000000' };
const modalHeaderStyle = { padding: '1.25rem 1.5rem', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' };
const modalTitleStyle = { fontSize: '1rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#000000', fontWeight: '900' };
const errorStyle = { padding: '0.75rem', background: '#fafafa', color: '#000000', border: '2px solid #000000', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '800' };
const miniBtnStyle = { padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: '900', background: '#f4f4f5', border: '1px solid #000000', borderRadius: '4px', cursor: 'pointer' };
