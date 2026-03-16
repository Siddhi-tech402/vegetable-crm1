'use client';

import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/auth/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/unauthorized');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
