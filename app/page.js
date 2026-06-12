import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from './api/auth/[...nextauth]/route';

export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role === 'analista_custo') {
    redirect('/ferramental');
  }
  redirect('/dashboard');
}
