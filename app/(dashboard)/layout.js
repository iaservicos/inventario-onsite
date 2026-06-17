import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';
import ClientLayout from './ClientLayout';

export const metadata = {
  title: 'Portal Onsite',
};

export default async function DashboardLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return <ClientLayout user={session.user}>{children}</ClientLayout>;
}
