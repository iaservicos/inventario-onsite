import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import Sidebar from '@/components/layout/Sidebar';

export const metadata = {
  title: 'Inventário Onsite - Dashboard',
};

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#ffffff' }}>
      <Sidebar user={session.user} />
      <main
        style={{
          flex: 1,
          marginLeft: '260px',
          minHeight: '100vh',
          overflow: 'auto',
          background: '#ffffff',
          width: 'calc(100% - 260px)',
        }}
      >
        {children}
      </main>
    </div>
  );
}
