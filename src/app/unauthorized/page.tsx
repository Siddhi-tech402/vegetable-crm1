import Link from 'next/link';
import { FiAlertTriangle, FiHome } from 'react-icons/fi';
import { Button } from '@/components/ui';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full mb-6">
          <FiAlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Access Denied</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          You don't have permission to access this page. Please contact your administrator if you
          believe this is an error.
        </p>
        <Link href="/dashboard">
          <Button leftIcon={<FiHome />}>Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
