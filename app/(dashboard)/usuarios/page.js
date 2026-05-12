'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import { formatDate, ROLE_LABELS } from '@/lib/utils';
import { toast } from 'sonner';

export default function UsuariosPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'supervisor' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetch('/api/users').then((r) => r.json()).then(setUsers).finally(() => setLoading(false));
    }
  }, [session]);

  async function createUser(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error); }
      toast.success('Usuário criado com sucesso!');
      setForm({ name: '', email: '', password: '', role: 'supervisor' });
      setShowForm(false);
      const updated = await fetch('/api/users').then((r) => r.json());
      setUsers(updated);
    } catch (err) {
      toast.error(err.message || 'Erro ao criar usuário');
    }
    setSaving(false);
  }

  async function toggleActive(user) {
    try {
      await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      });
      toast.success(`Usuário ${user.active ? 'desativado' : 'ativado'}!`);
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, active: !u.active } : u));
    } catch {
      toast.error('Erro ao atualizar usuário');
    }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '1.5rem', color: '#a3a3a3' }}>Carregando...</div>;
  }

  if (session?.user?.role !== 'admin') return null;

  return (
    <div style={{ padding: '1.5rem', maxWidth: '900px' }}>
      <PageHeader
        title="Usuários"
        subtitle="Gerenciamento de acesso ao sistema"
        actions={
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : '+ Novo Usuário'}
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="section-title" style={{ marginBottom: '1.25rem' }}>Novo Usuário</div>
          <form onSubmit={createUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#a3a3a3', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nome</label>
              <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#a3a3a3', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>E-mail</label>
              <input type="email" className="input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@empresa.com" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#a3a3a3', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Senha</label>
              <input type="password" className="input" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '500', color: '#a3a3a3', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Perfil</label>
              <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Administrador</option>
                <option value="supervisor">Supervisor</option>
                <option value="coordinator">Coordenador</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Criar Usuário'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Perfil</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: '#a3a3a3', padding: '2rem' }}>Nenhum usuário encontrado</td></tr>
              ) : users.map((u) => (
                <tr key={u.id}>
                  <td style={{ fontWeight: '500' }}>{u.name}</td>
                  <td style={{ color: '#737373' }}>{u.email}</td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: '500', padding: '2px 8px', borderRadius: '4px',
                      background: '#f5f5f5',
                      color: '#525252',
                      border: '1px solid #e5e5e5',
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.75rem', color: u.active ? '#404040' : '#a3a3a3' }}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td style={{ color: '#737373', fontSize: '0.8rem' }}>{formatDate(u.created_at)}</td>
                  <td>
                    {u.id !== session.user.id && (
                      <button
                        className={`btn ${u.active ? 'btn-danger' : 'btn-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.625rem' }}
                        onClick={() => toggleActive(u)}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
