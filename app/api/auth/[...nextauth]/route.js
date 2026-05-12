import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from '@/lib/db';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'E-mail', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        console.log('\n=== [AUTH DEBUG] Tentativa de login ===');
        console.log('[AUTH] Email recebido:', credentials?.email);
        console.log('[AUTH] Senha recebida:', credentials?.password ? '(preenchida)' : '(vazia)');
        console.log('[AUTH] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
        console.log('[AUTH] SERVICE_KEY presente:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
        console.log('[AUTH] NEXTAUTH_SECRET presente:', !!process.env.NEXTAUTH_SECRET);

        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] FALHOU: credenciais ausentes');
          return null;
        }

        let user;
        try {
          user = await getUserByEmail(credentials.email);
          console.log('[AUTH] Usuário encontrado:', user ? JSON.stringify({ id: user.id, email: user.email, active: user.active, hash_inicio: user.password_hash?.substring(0, 15) }) : 'null');
        } catch (err) {
          console.error('[AUTH] ERRO ao buscar usuário no Supabase:', err.message);
          return null;
        }

        if (!user) {
          console.log('[AUTH] FALHOU: usuário não encontrado');
          return null;
        }

        if (!user.active) {
          console.log('[AUTH] FALHOU: usuário inativo');
          return null;
        }

        let valid;
        try {
          valid = await bcrypt.compare(credentials.password, user.password_hash);
          console.log('[AUTH] Verificação de senha:', valid ? 'VÁLIDA' : 'INVÁLIDA');
        } catch (err) {
          console.error('[AUTH] ERRO ao verificar senha:', err.message);
          return null;
        }

        if (!valid) {
          console.log('[AUTH] FALHOU: senha incorreta');
          return null;
        }

        console.log('[AUTH] SUCESSO: login autorizado para', user.email);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
