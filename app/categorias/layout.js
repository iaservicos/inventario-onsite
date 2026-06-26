import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '../api/auth/[...nextauth]/route';

export const metadata = {
  title: 'Portal Onsite - Categorias',
};

export default async function CategoriasLayout({ children }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  return children;
}
