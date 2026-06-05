'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate, ROLE_LABELS } from '@/lib/utils';
import { toast } from 'sonner';

/* ─── Modal de Cadastro/Edição de Usuário ────────────────── */
function ModalUsuario({ usuario, onClose, onSaved, saving, supervisores }) {
  const [form, setForm] = useState({
    name:      usuario?.name      || '',
    email:     usuario?.email     || '',
    password:  '',
    role:      usuario?.role      || 'supervisor',
    linked_to: usuario?.linked_to || null,
    active:    usuario?.active !== undefined ? usuario.active : true,
  });

  const set = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const submit = async (e) => {
    e.preventDefault();
    onSaved(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={onClose}>
      <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '8px', overflow: 'hidden', border: '2px solid #000000' }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #000000', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f4f4f5' }}>
          <span style={{ fontSize: '1rem', fontWeight: '900', color: '#000000', textTransform: 'uppercase' }}>
            {usuario ? 'Editar Usuário' : 'Novo Usuário do Sistema'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#000000', fontWeight: '900' }}>✕</button>
        </div>
        <form onSubmit={submit} style={{ padding: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label="Nome completo *">
              <input name="name" value={form.name} onChange={set} required className="input" style={inputStyle} placeholder="Nome do usuário" />
            </Field>
            <Field label="E-mail *">
              <input name="email" type="email" value={form.email} onChange={set} required className="input" style={inputStyle} placeholder="email@empresa.com" />
            </Field>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <Field label={usuario ? "Nova Senha (opcional)" : "Senha *"}>
              <input 
                name="password" 
                type="password" 
                value={form.password} 
                onChange={set} 
                required={!usuario} 
                minLength={6} 
                className="input" 
                style={inputStyle} 
                placeholder="Mínimo 6 caracteres" 
              />
            </Field>
            <Field label="Perfil de Acesso">
              <select name="role" value={form.role} onChange={set} className="input" style={inputStyle}>
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
                <option value="coordinator">Coordenador</option>
                <option value="analyst">Analista</option>
              </select>
            </Field>
          </div>

          {form.role === 'analyst' && (
            <div style={{ marginBottom: '1rem' }}>
              <Field label="Supervisor vinculado *">
                <select
                  name="linked_to"
                  value={form.linked_to || ''}
                  onChange={(e) => setForm(f => ({ ...f, linked_to: e.target.value ? Number(e.target.value) : null }))}
                  className="input"
                  style={inputStyle}
                  required
                >
                  <option value="">Selecione o supervisor</option>
                  {(supervisores || []).map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: '0.7rem', color: '#888', marginTop: '0.3rem', fontWeight: '600' }}>
                  A analista enxerga os mesmos dados do supervisor selecionado.
                </div>
              </Field>
            </div>
          )}

          {usuario && (
            <div style={{ marginBottom: '1rem' }}>
              <Field label="Status da Conta">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '42px' }}>
                  <input 
                    type="checkbox" 
                    name="active" 
                    checked={form.active} 
                    onChange={set} 
                    id="active-check"
                  />
                  <label htmlFor="active-check" style={{ fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                    {form.active ? 'CONTA ATIVA' : 'CONTA INATIVA'}
                  </label>
                </div>
              </Field>
            </div>
          )}

          <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving} style={{ border: '1px solid #e4e4e7' }}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ background: '#000000', border: 'none', fontWeight: '900' }}>
              {saving ? 'PROCESSANDO...' : usuario ? 'SALVAR ALTERAÇÕES' : 'CRIAR USUÁRIO'}
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

const inputStyle = { border: '1px solid #000000', borderRadius: '4px', fontWeight: '600' };
const labelMiniStyle = { display: 'block', fontSize: '0.65rem', fontWeight: '900', color: '#71717a', marginBottom: '0.25rem', textTransform: 'uppercase' };

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    if (session?.user?.role !== 'admin') return;
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setUsers(list);
      setSupervisores(list.filter(u => u.role === 'supervisor' && u.active));
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
      toast.error('Erro ao carregar lista de usuários');
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    } else if (status === 'authenticated') {
      loadUsers();
    }
  }, [session, status, router, loadUsers]);

  const handleSave = async (formData) => {
    if (!modal) return;
    
    setSaving(true);
    try {
      const isEdit = modal.type === 'edit';
      const userId = modal.data?.id;
      
      if (isEdit && !userId) {
        throw new Error('ID do usuário não encontrado para edição');
      }

      const url = isEdit ? `/api/users/${userId}` : '/api/users';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar');
      }
      
      toast.success(isEdit ? 'Usuário atualizado!' : 'Usuário criado!');
      setModal(null);
      loadUsers();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Usuário ${user.active ? 'desativado' : 'ativado'}!`);
      loadUsers();
    } catch {
      toast.error('Erro ao atualizar status');
    }
  };

  if (status === 'loading') return null;
  if (session?.user?.role !== 'admin') return null;

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', width: '100%' }}>
      <PageHeader
        title="Usuários"
        subtitle="Gerenciamento de acesso e permissões do sistema"
        actions={
          <button 
            className="btn btn-primary" 
            onClick={() => setModal({ type: 'new', data: null })}
            style={{ background: '#000000', border: 'none', fontWeight: '900' }}
          >
            + NOVO USUÁRIO
          </button>
        }
      />

      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'center', border: '1px solid #e4e4e7' }}>
        <div style={{ flex: 1 }}>
          <label style={labelMiniStyle}>Busca</label>
          <input
            type="text"
            placeholder="Nome ou e-mail do usuário..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input"
            style={inputStyle}
          />
        </div>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', border: '1px solid #e4e4e7' }}>
        <div className="table-wrapper" style={{ border: 'none' }}>
          <table>
            <thead>
              <tr style={{ background: '#f4f4f5' }}>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Vínculo</th>
                <th>Status</th>
                <th>Criado em</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', fontWeight: '800' }}>CARREGANDO...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '3rem', fontWeight: '800' }}>NENHUM USUÁRIO ENCONTRADO</td></tr>
              ) : (
                filteredUsers.map(u => {
                  const supervisorName = u.role === 'analyst' && u.linked_to
                    ? (users.find(s => s.id === u.linked_to)?.name || `ID ${u.linked_to}`)
                    : null;
                  return (
                  <tr key={u.id} style={{ opacity: u.active ? 1 : 0.6 }}>
                    <td style={{ fontWeight: '800', color: '#000000' }}>{u.name}</td>
                    <td style={{ fontWeight: '600' }}>{u.email}</td>
                    <td>
                      <span className="badge" style={{ textTransform: 'uppercase', background: '#f0f0f0', color: '#000000', border: '1px solid #ccc', fontWeight: '800', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: '#555', fontWeight: '600' }}>
                      {supervisorName ? (
                        <span>↳ {supervisorName}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className="badge" style={{ textTransform: 'uppercase', background: u.active ? '#000000' : '#ffffff', color: u.active ? '#ffffff' : '#000000', border: '1px solid #000000', fontWeight: '800', fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        {u.active ? 'ATIVO' : 'INATIVO'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem', fontWeight: '600' }}>{formatDate(u.created_at)}</td>
                    <td style={{ textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '0.3rem 0.8rem', fontWeight: '800', border: '1px solid #000000', background: '#ffffff', color: '#000000' }} 
                        onClick={() => setModal({ type: 'edit', data: u })}
                      >
                        EDITAR
                      </button>
                      {u.id !== session.user.id && (
                        <button 
                          className="btn btn-secondary" 
                          style={{ 
                            padding: '0.3rem 0.8rem', 
                            fontWeight: '800', 
                            border: '1px solid #000000',
                            background: '#ffffff',
                            color: '#000000'
                          }} 
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? 'DESATIVAR' : 'ATIVAR'}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <ModalUsuario
          usuario={modal.data}
          saving={saving}
          supervisores={supervisores}
          onClose={() => setModal(null)}
          onSaved={handleSave}
        />
      )}
    </div>
  );
}
