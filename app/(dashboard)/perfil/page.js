'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import PageHeader from '@/components/ui/PageHeader';
import { toast } from 'sonner';

export default function PerfilPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      return toast.error('As novas senhas não coincidem');
    }
    if (form.newPassword.length < 6) {
      return toast.error('A nova senha deve ter no mínimo 6 caracteres');
    }

    setLoading(true);
    try {
      const res = await fetch('/api/profile/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: form.currentPassword,
          newPassword: form.newPassword
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao alterar senha');

      toast.success('Senha alterada com sucesso!');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', width: '100%', maxWidth: '800px' }}>
      <PageHeader 
        title="Meu Perfil" 
        subtitle="Gerencie suas informações de acesso e segurança" 
      />

      <div className="card" style={{ marginTop: '2rem', border: '2px solid #000000' }}>
        <div style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #eeeeee' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '800', color: '#000000' }}>Alterar Senha</h3>
          <p style={{ fontSize: '0.8rem', color: '#666666' }}>Recomendamos o uso de uma senha forte que você não utilize em outros sites.</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#000000', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Senha Atual
            </label>
            <input
              type="password"
              className="input"
              required
              value={form.currentPassword}
              onChange={e => setForm({...form, currentPassword: e.target.value})}
              style={{ border: '1px solid #000000', fontWeight: '600' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '600px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#000000', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Nova Senha
              </label>
              <input
                type="password"
                className="input"
                required
                value={form.newPassword}
                onChange={e => setForm({...form, newPassword: e.target.value})}
                style={{ border: '1px solid #000000', fontWeight: '600' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: '900', color: '#000000', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                className="input"
                required
                value={form.confirmPassword}
                onChange={e => setForm({...form, confirmPassword: e.target.value})}
                style={{ border: '1px solid #000000', fontWeight: '600' }}
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ background: '#000000', border: 'none', fontWeight: '900', padding: '0.75rem 2rem' }}
            >
              {loading ? 'PROCESSANDO...' : 'ATUALIZAR SENHA'}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', background: '#f9f9f9' }}>
        <h3 style={{ fontSize: '0.8rem', fontWeight: '800', color: '#000000', marginBottom: '0.5rem' }}>Dados da Conta</h3>
        <div style={{ fontSize: '0.8rem', color: '#333333' }}>
          <div style={{ marginBottom: '0.25rem' }}><strong>Nome:</strong> {session?.user?.name}</div>
          <div><strong>E-mail:</strong> {session?.user?.email}</div>
          <div style={{ marginTop: '0.5rem' }}>
            <strong>Perfil:</strong> <span className="badge badge-info" style={{ marginLeft: '0.5rem' }}>{session?.user?.role}</span>
          </div>
        </div>
      </div>
    </div>
  );
}