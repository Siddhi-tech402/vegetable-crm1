'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found in the link. Please request a new verification email.');
      return;
    }

    const verify = async () => {
      try {
        // Use absolute-path fetch so it always hits the right server
        const res = await fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
        
        let data: { message?: string; error?: string } = {};
        try {
          data = await res.json();
        } catch {
          // JSON parse failed
        }

        if (res.ok) {
          setStatus('success');
          setMessage(data.message || 'Email verified successfully! You can now log in.');
        } else if (res.status === 410) {
          setStatus('expired');
          setMessage(data.error || 'Verification link has expired. Please sign up again.');
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may already have been used.');
        }
      } catch {
        setStatus('error');
        setMessage('A network error occurred. Make sure you are connected and try again.');
      }
    };

    verify();
  }, [token]);

  // Countdown + auto-redirect on success
  useEffect(() => {
    if (status !== 'success') return;
    if (countdown <= 0) {
      router.push('/auth/login');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [status, countdown, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Email Verification</h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">

          {/* ── Loading ── */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">Verifying your email…</p>
            </div>
          )}

          {/* ── Success ── */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Email Verified! 🎉</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">{message}</p>
                <p className="text-gray-500 dark:text-gray-500 text-xs">
                  Redirecting to login in <span className="font-semibold text-primary-600 dark:text-primary-400">{countdown}s</span>…
                </p>
              </div>
              <Link
                href="/auth/login"
                className="mt-2 inline-block bg-primary-500 hover:bg-primary-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
              >
                Go to Login →
              </Link>
            </div>
          )}

          {/* ── Expired ── */}
          {status === 'expired' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link Expired</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <Link
                  href="/auth/signup"
                  className="flex-1 text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Sign Up Again
                </Link>
                <Link
                  href="/auth/login"
                  className="flex-1 text-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Back to Login
                </Link>
              </div>
            </div>
          )}

          {/* ── Error ── */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verification Failed</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">{message}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
                <Link
                  href="/auth/login"
                  className="flex-1 text-center bg-primary-500 hover:bg-primary-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Back to Login
                </Link>
                <Link
                  href="/auth/signup"
                  className="flex-1 text-center border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  Sign Up Again
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-12 h-12 rounded-full border-4 border-primary-200 border-t-primary-500 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
