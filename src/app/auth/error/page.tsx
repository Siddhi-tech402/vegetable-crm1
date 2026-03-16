'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from '@/components/ui';

function AuthErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const errorMessages: Record<string, string> = {
    Configuration: 'There is a problem with the server configuration.',
    AccessDenied: 'You do not have permission to sign in.',
    Verification: 'The verification link may have expired or already been used.',
    Default: 'An error occurred during authentication.',
  };

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full mb-6">
          <FiAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Authentication Error
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">{errorMessage}</p>
        <div className="space-y-4">
          <Link href="/auth/login">
            <Button className="w-full">Try Again</Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <AuthErrorContent />
    </Suspense>
  );
}
