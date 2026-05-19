import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createServiceClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();
    const supabase = createServiceClient();

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('password')
      .eq('id', session.user.id)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword, updated_at: new Date().toISOString() })
      .eq('id', session.user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    return NextResponse.json({ error: 'Erro interno ao processar alteração' }, { status: 500 });
  }
}
