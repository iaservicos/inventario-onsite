'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';

const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

/* ─── Modal de Edição ─────────────────────────────────────── */
function ModalEdicao({ tecnico, onClose, onSaved, isAdmin }) {
  const [form, setForm] = useState({
    name:            tecnico?.name            || '',
    email:           tecnico?.email           || '',
    phone:           tecnico?.phone           || '',
    region:          tecnico?.region          || '',
    supervisor_name: tecnico?.supervisor_name || '',
    databricks_name: tecnico?.databricks_name || '',
    databricks_id:   tecnico?.databricks_id   || '',
    active:          tecnico?.active          ?? true,
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
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Editar Técnico</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="modal-body">
          {error && <div className="form-err">{error}</div>}

          <div className="row2">
            <Field label="Nome completo *">
              <input name="name" value={form.name} onChange={set} required className="inp" />
            </Field>
            <Field label="E-mail">
              <input name="email" type="email" value={form.email} onChange={set} className="inp" placeholder="email@positivo.com.br" />
            </Field>
          </div>
          <div className="row2">
            <Field label="Telefone (WhatsApp)" hint="Formato: 55 + DDD + número">
              <input name="phone" value={form.phone} onChange={set} className="inp" placeholder="5541999999999" />
            </Field>
            <Field label="Estado">
              <select name="region" value={form.region} onChange={set} className="inp">
                <option value="">Selecione</option>
                {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </Field>
          </div>

          {isAdmin && (
            <>
              <Field label="Supervisor">
                <input name="supervisor_name" value={form.supervisor_name} onChange={set} className="inp" placeholder="Nome do supervisor" />
              </Field>

              <div className="divider"><span>Vínculo Databricks</span></div>

              <div className="row2">
                <Field label="Nome no Databricks">
                  <input name="databricks_name" value={form.databricks_name} onChange={set} className="inp" placeholder="Nome exato no Data Lake" />
                </Field>
                <Field label="ID no Databricks">
                  <input name="databricks_id" type="number" value={form.databricks_id} onChange={set} className="inp" placeholder="Ex: 17338" />
                </Field>
              </div>

              <label className="check-label">
                <input name="active" type="checkbox" checked={form.active} onChange={set} className="chk" />
                Técnico ativo
              </label>
            </>
          )}

          <div className="modal-foot">
            <button type="button" className="btn-sec" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-pri" disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Modal Confirmar Exclusão ────────────────────────────── */
function ModalDelete({ tecnico, onClose, onConfirm, loading }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <span className="modal-title">Excluir técnico</span>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ color: '#a1a1aa', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p>Tem certeza que deseja excluir <strong style={{ color: '#f4f4f5' }}>{tecnico?.name}</strong>?</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#52525b' }}>
            Se o técnico possuir inventários vinculados, ele será <strong>inativado</strong> em vez de excluído para preservar o histórico.
          </p>
        </div>
        <div className="modal-foot">
          <button className="btn-sec" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="btn-del" onClick={onConfirm} disabled={loading}>
            {loading ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Componente auxiliar Field ───────────────────────────── */
function Field({ label, hint, children }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

/* ─── Página principal ────────────────────────────────────── */
export default function CadastroTecnicosPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'admin';

  const [tecnicos,      setTecnicos]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [regionFlt,     setRegionFlt]     = useState('');
  const [showInactive,  setShowInactive]  = useState(false);
  const [editando,      setEditando]      = useState(null);
  const [deletando,     setDeletando]     = useState(null);
  const [delLoading,    setDelLoading]    = useState(false);
  const [dbCheck,       setDbCheck]       = useState({});
  const [dbLoading,     setDbLoading]     = useState({});
  const [toast,         setToast]         = useState('');

  const notify = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search)       p.set('search', search);
    if (regionFlt)    p.set('region', regionFlt);
    if (showInactive) p.set('active', 'false');
    const res  = await fetch(`/api/technicians?${p}`);
    const data = await res.json();
    setTecnicos(Array.isArray(data) ? data : []);
    setLoading(false);
  }, [search, regionFlt, showInactive]);

  useEffect(() => { load(); }, [load]);

  const onSaved = (updated) => {
    setTecnicos(prev => prev.map(t => t.id === updated.id ? updated : t));
    setEditando(null);
    notify('Técnico atualizado com sucesso.');
  };

  const onDelete = async () => {
    if (!deletando) return;
    setDelLoading(true);
    try {
      const res  = await fetch(`/api/technicians/${deletando.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao excluir');
      if (data._inactivated) {
        setTecnicos(prev => prev.map(t => t.id === deletando.id ? { ...t, active: false } : t));
        notify('Técnico inativado (possui inventários vinculados).');
      } else {
        setTecnicos(prev => prev.filter(t => t.id !== deletando.id));
        notify('Técnico excluído com sucesso.');
      }
      setDeletando(null);
    } catch (err) { notify(`Erro: ${err.message}`); }
    finally { setDelLoading(false); }
  };

  const checkDb = async (t) => {
    setDbLoading(prev => ({ ...prev, [t.id]: true }));
    try {
      const res  = await fetch(`/api/technicians/${t.id}/sync-items`);
      const data = await res.json();
      setDbCheck(prev => ({ ...prev, [t.id]: data }));
    } catch {
      setDbCheck(prev => ({ ...prev, [t.id]: { error: 'Falha' } }));
    }
    setDbLoading(prev => ({ ...prev, [t.id]: false }));
  };

  const regioes = [...new Set(tecnicos.map(t => t.region).filter(Boolean))].sort();

  const formatPhone = (p) => {
    if (!p) return '—';
    const d = p.replace(/\D/g, '');
    if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`;
    if (d.length === 12) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,8)}-${d.slice(8)}`;
    return p;
  };

  return (
    <div className="pg">
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle={isAdmin
          ? `${tecnicos.length} técnico${tecnicos.length !== 1 ? 's' : ''} encontrado${tecnicos.length !== 1 ? 's' : ''}`
          : `Seus técnicos — ${tecnicos.length} encontrado${tecnicos.length !== 1 ? 's' : ''}`}
      />

      {/* Filtros */}
      <div className="filters">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="inp-filter"
          style={{ flex: 2 }}
        />
        <select value={regionFlt} onChange={e => setRegionFlt(e.target.value)} className="inp-filter">
          <option value="">Todos os estados</option>
          {regioes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {isAdmin && (
          <label className="chk-label">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="empty">Carregando técnicos...</div>
      ) : tecnicos.length === 0 ? (
        <div className="empty">
          <p>Nenhum técnico encontrado.</p>
          {!isAdmin && <p className="empty-sub">Você visualiza apenas os técnicos vinculados ao seu perfil de supervisor.</p>}
        </div>
      ) : (
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>UF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                {isAdmin && <th>Supervisor</th>}
                <th>Databricks</th>
                <th>Status</th>
                <th className="th-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map(t => {
                const db = dbCheck[t.id];
                return (
                  <tr key={t.id} style={{ opacity: t.active ? 1 : 0.45 }}>
                    <td className="td-name">{t.name}</td>
                    <td><span className="tag">{t.region || '—'}</span></td>
                    <td className="td-mono">{formatPhone(t.phone)}</td>
                    <td className="td-muted">{t.email || '—'}</td>
                    {isAdmin && <td className="td-muted">{t.supervisor_name || '—'}</td>}
                    <td>
                      {db ? (
                        db.error
                          ? <span className="tag tag-err" title={db.error}>Erro</span>
                          : <span className="tag tag-ok">{db.total_items ?? 0} peças</span>
                      ) : t.databricks_name ? (
                        <button className="btn-db" onClick={() => checkDb(t)} disabled={dbLoading[t.id]}>
                          {dbLoading[t.id] ? '...' : 'Verificar'}
                        </button>
                      ) : (
                        <span className="td-dim">Sem vínculo</span>
                      )}
                    </td>
                    <td>
                      <span className={`tag ${t.active ? 'tag-on' : 'tag-off'}`}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="acts">
                        <button className="btn-edit" onClick={() => setEditando(t)}>Editar</button>
                        {isAdmin && (
                          <button className="btn-del-sm" onClick={() => setDeletando(t)}>Excluir</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editando  && <ModalEdicao tecnico={editando} onClose={() => setEditando(null)} onSaved={onSaved} isAdmin={isAdmin} />}
      {deletando && <ModalDelete tecnico={deletando} onClose={() => setDeletando(null)} onConfirm={onDelete} loading={delLoading} />}

      {toast && <div className="toast">{toast}</div>}

      
    </div>
  );
}
