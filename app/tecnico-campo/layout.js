import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';

export const metadata = {
  title: 'Técnico de Campo - Portal Onsite',
  viewport: 'width=device-width, initial-scale=1, viewport-fit=cover'
};

export default async function TecnicoCampoLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Verifica se o usuário tem role de técnico
  const isTecnico = session.user?.role?.includes('tecnico') || session.user?.role === 'field_technician';
  if (!isTecnico) redirect('/dashboard');

  return (
    <html lang="pt-BR">
      <head>
        <meta name="theme-color" content="#0f172a" />
        <meta name="mobile-web-app-capable" content="true" />
        <meta name="apple-mobile-web-app-capable" content="true" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Inter', system-ui", background: '#f0f4f8' }}>
        {children}
      </body>
    </html>
  );
}
