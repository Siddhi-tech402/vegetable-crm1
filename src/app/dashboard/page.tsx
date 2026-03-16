export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/auth/login');
  }

  const role = session.user.role;

  if (role === 'farmer') {
    redirect('/farmer/dashboard');
  } else if (role === 'vendor') {
    redirect('/vendor/dashboard');
  } else if (role === 'admin') {
    redirect('/admin/dashboard');
  }

  // Default fallback
  redirect('/auth/login');
}
