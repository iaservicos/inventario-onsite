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
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        try {
          const user = await getUserByEmail(credentials.email);
          
          if (!user || !user.active) {
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, user.password_hash);
          
          if (!valid) {
            return null;
          }

          return {
            id:        user.id,
            name:      user.name,
            email:     user.email,
            role:      user.role,
            linked_to: user.linked_to || null,
          };
        } catch (err) {
          console.error('[AUTH ERROR]', err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id        = user.id;
        token.role      = user.role;
        token.linked_to = user.linked_to;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id        = token.id;
        session.user.role      = token.role;
        session.user.linked_to = token.linked_to;
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
