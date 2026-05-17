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
    <div className="ct-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={e => e.stopPropagation()}>
        <div className="ct-modal-head">
          <span className="ct-modal-title">Editar Técnico</span>
          <button className="ct-close-btn" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit} className="ct-modal-body">
          {error && <div className="ct-form-err">{error}</div>}

          <div className="ct-row2">
            <div className="ct-field">
              <label className="ct-field-label">Nome completo *</label>
              <input name="name" value={form.name} onChange={set} required className="ct-inp" />
            </div>
            <div className="ct-field">
              <label className="ct-field-label">E-mail</label>
              <input name="email" type="email" value={form.email} onChange={set} className="ct-inp" placeholder="email@positivo.com.br" />
            </div>
          </div>
          <div className="ct-row2">
            <div className="ct-field">
              <label className="ct-field-label">Telefone (WhatsApp)</label>
              <input name="phone" value={form.phone} onChange={set} className="ct-inp" placeholder="5541999999999" />
              <span className="ct-field-hint">Formato: 55 + DDD + número</span>
            </div>
            <div className="ct-field">
              <label className="ct-field-label">Estado</label>
              <select name="region" value={form.region} onChange={set} className="ct-inp">
                <option value="">Selecione</option>
                {ESTADOS_BR.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
          </div>

          {isAdmin && (
            <>
              <div className="ct-field">
                <label className="ct-field-label">Supervisor</label>
                <input name="supervisor_name" value={form.supervisor_name} onChange={set} className="ct-inp" placeholder="Nome do supervisor" />
              </div>

              <div className="ct-divider"><span>Vínculo Databricks</span></div>

              <div className="ct-row2">
                <div className="ct-field">
                  <label className="ct-field-label">Nome no Databricks</label>
                  <input name="databricks_name" value={form.databricks_name} onChange={set} className="ct-inp" placeholder="Nome exato no Data Lake" />
                </div>
                <div className="ct-field">
                  <label className="ct-field-label">ID no Databricks</label>
                  <input name="databricks_id" type="number" value={form.databricks_id} onChange={set} className="ct-inp" placeholder="Ex: 17338" />
                </div>
              </div>

              <label className="ct-check-label">
                <input name="active" type="checkbox" checked={form.active} onChange={set} className="ct-chk" />
                Técnico ativo
              </label>
            </>
          )}

          <div className="ct-modal-foot">
            <button type="button" className="ct-btn-sec" onClick={onClose} disabled={saving}>Cancelar</button>
            <button type="submit" className="ct-btn-pri" disabled={saving}>
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
    <div className="ct-overlay" onClick={onClose}>
      <div className="ct-modal ct-modal-sm" onClick={e => e.stopPropagation()}>
        <div className="ct-modal-head">
          <span className="ct-modal-title">Excluir técnico</span>
          <button className="ct-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="ct-modal-body" style={{ color: '#a3a3a3', fontSize: '0.875rem', lineHeight: 1.6 }}>
          <p>Tem certeza que deseja excluir <strong style={{ color: '#f0f0f0' }}>{tecnico?.name}</strong>?</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#525252' }}>
            Se o técnico possuir inventários vinculados, ele será <strong>inativado</strong> em vez de excluído para preservar o histórico.
          </p>
        </div>
        <div className="ct-modal-foot">
          <button className="ct-btn-sec" onClick={onClose} disabled={loading}>Cancelar</button>
          <button className="ct-btn-del" onClick={onConfirm} disabled={loading}>
            {loading ? 'Excluindo...' : 'Confirmar exclusão'}
          </button>
        </div>
      </div>
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
    <div className="ct-pg">
      <PageHeader
        title="Cadastro de Técnicos"
        subtitle={isAdmin
          ? `${tecnicos.length} técnico${tecnicos.length !== 1 ? 's' : ''} encontrado${tecnicos.length !== 1 ? 's' : ''}`
          : `Seus técnicos — ${tecnicos.length} encontrado${tecnicos.length !== 1 ? 's' : ''}`}
      />

      {/* Filtros */}
      <div className="ct-filters">
        <input
          type="text"
          placeholder="Buscar por nome..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="ct-inp-filter ct-inp-filter-wide"
        />
        <select value={regionFlt} onChange={e => setRegionFlt(e.target.value)} className="ct-inp-filter">
          <option value="">Todos os estados</option>
          {regioes.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {isAdmin && (
          <label className="ct-chk-label">
            <input type="checkbox" checked={showInactive} onChange={e => setShowInactive(e.target.checked)} />
            Mostrar inativos
          </label>
        )}
      </div>

      {/* Conteúdo */}
      {loading ? (
        <div className="ct-empty">Carregando técnicos...</div>
      ) : tecnicos.length === 0 ? (
        <div className="ct-empty">
          <p>Nenhum técnico encontrado.</p>
          {!isAdmin && <p className="ct-empty-sub">Você visualiza apenas os técnicos vinculados ao seu perfil de supervisor.</p>}
        </div>
      ) : (
        <div className="ct-tbl-wrap">
          <table className="ct-tbl">
            <thead>
              <tr>
                <th>Nome</th>
                <th>UF</th>
                <th>Telefone</th>
                <th>E-mail</th>
                {isAdmin && <th>Supervisor</th>}
                <th>Databricks</th>
                <th>Status</th>
                <th className="ct-th-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tecnicos.map(t => {
                const db = dbCheck[t.id];
                return (
                  <tr key={t.id} style={{ opacity: t.active ? 1 : 0.45 }}>
                    <td className="ct-td-name">{t.name}</td>
                    <td><span className="ct-tag">{t.region || '—'}</span></td>
                    <td className="ct-td-mono">{formatPhone(t.phone)}</td>
                    <td className="ct-td-muted">{t.email || '—'}</td>
                    {isAdmin && <td className="ct-td-muted">{t.supervisor_name || '—'}</td>}
                    <td>
                      {db ? (
                        db.error
                          ? <span className="ct-tag ct-tag-err" title={db.error}>Erro</span>
                          : <span className="ct-tag ct-tag-ok">{db.total_items ?? 0} peças</span>
                      ) : t.databricks_name ? (
                        <button className="ct-btn-db" onClick={() => checkDb(t)} disabled={dbLoading[t.id]}>
                          {dbLoading[t.id] ? '...' : 'Verificar'}
                        </button>
                      ) : (
                        <span className="ct-td-dim">Sem vínculo</span>
                      )}
                    </td>
                    <td>
                      <span className={`ct-tag ${t.active ? 'ct-tag-on' : 'ct-tag-off'}`}>
                        {t.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td>
                      <div className="ct-acts">
                        <button className="ct-btn-edit" onClick={() => setEditando(t)}>Editar</button>
                        {isAdmin && (
                          <button className="ct-btn-del-sm" onClick={() => setDeletando(t)}>Excluir</button>
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

      {toast && <div className="ct-toast">{toast}</div>}
    </div>
  );
}
