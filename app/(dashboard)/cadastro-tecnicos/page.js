'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

/* ─── Modal de Edição ─────────────────────────────────────── */
function ModalEdicao({ tecnico, onClose, onSaved }) {
  const [form, setForm] = useState({
    name:            tecnico?.name            || '',
    email:           tecnico?.email           || '',
    phone:           tecnico?.phone           || '',
    region:          tecnico?.region          || '',
    supervisor_name: tecnico?.supervisor_name || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const res  = await fetch(`/api/technicians/${tecnico.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar');
      onSaved(data);
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #eeeeee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#000000' }}>Editar Técnico</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#888888' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          {error && <div style={{ padding: '0.75rem', background: '#f0f0f0', color: '#000000', border: '1px solid #000000', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.8rem', fontWeight: '700' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Nome completo *">
              <input name="name" value={form.name} onChange={set} required className="input" />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" value={form.email} onChange={set} className="input" placeholder="email@positivo.com.br" />
            </Field>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Telefone (WhatsApp)">
              <input name="phone" value={form.phone} onChange={set} className="input" placeholder="5541999999999" />
            </Field>
            <Field label="Estado">
              <select name="region" value={form.region} onChange={set} className="input">
                <option value="">Selecione</option>
                {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Supervisor">
            <input name="supervisor_name" value={form.supervisor_name} onChange={set} className="input" placeholder="Nome do supervisor" />
          </Field>

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Edição em Massa ──────────────────────────────── */
function ModalMassa({ selecionados, onClose, onSaved }) {
  const [supervisor, setSupervisor] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!supervisor) return;
    setSaving(true);
    try {
      const promises = selecionados.map(id => 
        fetch(`/api/technicians/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ supervisor_name: supervisor }),
        })
      );
      await Promise.all(promises);
      onSaved();
    } catch (err) { alert('Erro ao atualizar em massa'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '400px', borderRadius: '8px', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #eeeeee', fontWeight: '800' }}>Editar {selecionados.length} Técnicos</div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <Field label="Novo Supervisor">
            <input value={supervisor} onChange={e => setSupervisor(e.target.value)} className="input" placeholder="Nome do novo supervisor" required />
          </Field>
          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Atualizando...' : 'Confirmar Alteração'}
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
      <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '800', color: '#333333', marginBottom: '0.35rem', textTransform: 'uppercase' }}>{label}</label>
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
  const [showInactive,  setShowInactive]  = useState(false);
  const [editando,      setEditando]      = useState(null);
  const [selecionados,  setSelecionados]  = useState([]);
  const [showMassa,     setShowMassa]     = useState(false);
  const [dbStatus,      setDbStatus]      = useState({});

  const checkDb = useCallback(async (id) => {
    try {
      const res = await fetch(`/api/technicians/${id}/sync-items`);
      if (!res.ok) {
        setDbStatus(prev => ({ ...prev, [id]: 'NOT_OK' }));
        return;
      }
      const data = await res.json();
      setDbStatus(prev => ({ ...prev, [id]: data.found_in_databricks ? 'OK' : 'NOT_OK' }));
    } catch {
      setDbStatus(prev => ({ ...prev, [id]: 'NOT_OK' }));
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)       p.set('search', search);
      if (regionFlt)    p.set('region', regionFlt);
      if (showInactive) p.set('active', 'false');
      const res  = await fetch(`/api/technicians?${p}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setTecnicos(list);
      
      // Dispara a verificação para todos os técnicos da lista de forma independente
      list.forEach(t => {
        checkDb(t.id);
      });
    } catch (err) {
      console.error('Erro ao carregar técnicos:', err);
      setTecnicos([]);
    } finally {
      setLoading(false);
    }
  }, [search, regionFlt, showInactive, checkDb]);

  useEffect(() => { load(); }, [load]);

  const toggleSelect = (id) => {
    setSelecionados(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const regioes = [...new Set(tecnicos.map(t => t.region).filter(Boolean))].sort();

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle="Gerenciamento e validação de técnicos com o Datalake"
        actions={
          selecionados.length > 0 && (
            <button className="btn btn-primary" onClick={() => setShowMassa(true)}>
              Editar {selecionados.length} em Massa
            </button>
          )
        }
      />

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input"
          style={{ flex: 1 }}
        />
        <select value={regionFlt} onChange={e => setRegionFlt(e.target.value)} className="input" style={{ width: '200px' }}>
          <option value="">Todos os estados</option>
          {regioes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: '700', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
          Mostrar inativos
        </label>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input type="checkbox" onChange={e => setSelecionados(e.target.checked ? tecnicos.map(t => t.id) : [])} checked={selecionados.length === tecnicos.length && tecnicos.length > 0} />
                </th>
                <th>Nome</th>
                <th>UF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Supervisor</th>
                <th>Datalake</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Carregando técnicos...</td></tr>
              ) : tecnicos.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '3rem', fontWeight: '700' }}>Nenhum técnico encontrado</td></tr>
              ) : (
                tecnicos.map(t => (
                  <tr key={t.id} style={{ opacity: t.active ? 1 : 0.5 }}>
                    <td><input type="checkbox" checked={selecionados.includes(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                    <td style={{ fontWeight: '800', color: '#000000' }}>{t.name}</td>
                    <td><span className="badge badge-info">{t.region || '—'}</span></td>
                    <td style={{ fontWeight: '600' }}>{t.phone || '—'}</td>
                    <td style={{ fontWeight: '600' }}>{t.email || '—'}</td>
                    <td style={{ fontWeight: '700', color: '#000000' }}>{t.supervisor_name || '—'}</td>
                    <td>
                      {dbStatus[t.id] === 'OK' && <span className="badge badge-ok">OK</span>}
                      {dbStatus[t.id] === 'NOT_OK' && <span className="badge badge-not-ok">NÃO OK</span>}
                      {!dbStatus[t.id] && <span style={{ fontSize: '0.7rem', color: '#888888' }}>...</span>}
                    </td>
                    <td>
                      <span className={`badge ${t.active ? 'badge-success' : 'badge-info'}`}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-secondary" style={{ padding: '0.3rem 0.6rem' }} onClick={() => setEditando(t)}>Editar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editando && <ModalEdicao tecnico={editando} onClose={() => setEditando(null)} onSaved={() => { load(); setEditando(null); }} />}
      {showMassa && <ModalMassa selecionados={selecionados} onClose={() => setShowMassa(false)} onSaved={() => { load(); setShowMassa(false); setSelecionados([]); }} />}
    </div>
  );
}
