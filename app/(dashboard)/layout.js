import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import Sidebar from '@/components/layout/Sidebar';

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      <Sidebar user={session.user} />
      <main
        style={{
          flex: 1,
          marginLeft: '220px',
          minHeight: '100vh',
          overflow: 'auto',
          background: '#f5f5f5',
        }}
      >
        {children}
      </main>
    </div>
  );
}
