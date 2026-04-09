'use client';

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiWifiOff } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Detect online/offline status
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline  = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // If already logged in (session cookie still valid), redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role;
      if (role === 'farmer')      router.replace('/farmer/dashboard');
      else if (role === 'vendor') router.replace('/vendor/dashboard');
      else if (role === 'admin')  router.replace('/admin/dashboard');
    }
  }, [session, status, router]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) newErrors.email = 'Invalid email format';
    if (!formData.password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isOffline) {
      toast.error('Cannot sign in while offline. Please check your internet connection.');
      return;
    }
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success('Login successful!');
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Welcome Back</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Sign in to your Vegetable CRM account
          </p>
        </div>

        {/* Offline Alert */}
        {isOffline && (
          <div className="mb-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-4 flex gap-3 items-start">
            <FiWifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">
                You are offline
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Sign in requires internet. If you were already logged in, tap below to continue.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => router.push('/vendor/dashboard')}
                  className="text-xs font-semibold bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors"
                >
                  Vendor Dashboard →
                </button>
                <button
                  onClick={() => router.push('/farmer/dashboard')}
                  className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors"
                >
                  Farmer Dashboard →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="Enter your email"
              leftIcon={<FiMail />}
              autoComplete="email"
              required
              disabled={isOffline}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="Enter your password"
                leftIcon={<FiLock />}
                autoComplete="current-password"
                required
                disabled={isOffline}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
              disabled={isOffline || isLoading}
            >
              {isOffline ? 'Sign In (No Internet)' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{' '}
              <Link
                href="/auth/signup"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
