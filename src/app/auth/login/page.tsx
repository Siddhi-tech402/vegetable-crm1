'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiWifiOff, FiArrowLeft } from 'react-icons/fi';
import { Button, Input } from '@/components/ui';

type VerifyStep = 'idle' | 'send' | 'code' | 'verified';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // ── Login state ──────────────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── OTP / Verify-email panel state ──────────────────────────────────────────
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── Detect online/offline ────────────────────────────────────────────────────
  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const on  = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  // ── Redirect if already logged in ────────────────────────────────────────────
  useEffect(() => {
    if (status === 'authenticated' && session?.user?.role) {
      const role = session.user.role;
      if (role === 'farmer')      router.replace('/farmer/dashboard');
      else if (role === 'vendor') router.replace('/vendor/dashboard');
      else if (role === 'admin')  router.replace('/admin/dashboard');
    }
  }, [session, status, router]);

  // ── Resend cooldown timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Login form helpers ────────────────────────────────────────────────────────
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
    if (isOffline) { toast.error('Cannot sign in while offline.'); return; }
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });
      if (result?.error) {
        console.log('[Login] NextAuth error:', result.error); // debug
        if (
          result.error.includes('verify your email') ||
          result.error.includes('Please verify') ||
          result.error === 'Please verify your email before logging in'
        ) {
          // Switch to verify panel, pre-fill email
          setVerifyEmail(formData.email);
          setVerifyStep('send');
        } else {
          toast.error(result.error);
        }
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

  // ── OTP helpers ───────────────────────────────────────────────────────────────
  const sendCode = async () => {
    if (!verifyEmail) { toast.error('Please enter your email.'); return; }
    setSendingCode(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to send code.'); return; }
      toast.success('Verification code sent to your email!');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setVerifyStep('code');
      setResendCooldown(60);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return; // digits only
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    setOtpError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const verifyCode = async () => {
    const code = otp.join('');
    if (code.length < 6) { setOtpError('Please enter all 6 digits.'); return; }
    setVerifyingCode(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOtpError(data.error || 'Invalid code.');
        if (res.status === 410) setVerifyStep('send'); // expired → go back
        return;
      }
      setVerifyStep('verified');
      toast.success('Email verified! You can now log in.');
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  // ── RENDER ────────────────────────────────────────────────────────────────────
  const isVerifyMode = verifyStep !== 'idle';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isVerifyMode ? 'Verify Your Email' : 'Welcome Back'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            {isVerifyMode
              ? 'Enter the code sent to your email'
              : 'Sign in to your Vegetable CRM account'}
          </p>
        </div>

        {/* Offline Alert */}
        {isOffline && !isVerifyMode && (
          <div className="mb-4 rounded-xl bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-4 flex gap-3 items-start">
            <FiWifiOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">You are offline</p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-0.5">
                Sign in requires internet. If you were already logged in, tap below to continue.
              </p>
              <div className="mt-3 flex gap-2">
                <button onClick={() => router.push('/vendor/dashboard')} className="text-xs font-semibold bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-700 transition-colors">Vendor Dashboard →</button>
                <button onClick={() => router.push('/farmer/dashboard')} className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors">Farmer Dashboard →</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 md:p-8">

          {/* ══ VERIFY MODE ══════════════════════════════════════════════════════ */}
          {isVerifyMode ? (
            <div>
              {/* Back to login */}
              <button
                onClick={() => { setVerifyStep('idle'); setOtp(['','','','','','']); setOtpError(''); }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
              >
                <FiArrowLeft className="w-4 h-4" /> Back to login
              </button>

              {/* ── Step: Enter email + Send code ── */}
              {verifyStep === 'send' && (
                <div className="space-y-5">
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                      📧 Your email is not verified yet
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      Enter your email below and we&apos;ll send a 6-digit verification code.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="email"
                        value={verifyEmail}
                        onChange={(e) => setVerifyEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                      />
                    </div>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    onClick={sendCode}
                    isLoading={sendingCode}
                  >
                    Send Verification Code
                  </Button>
                </div>
              )}

              {/* ── Step: Enter OTP code ── */}
              {verifyStep === 'code' && (
                <div className="space-y-5">
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
                      <FiMail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      We sent a 6-digit code to
                    </p>
                    <p className="text-sm font-semibold text-primary-600 dark:text-primary-400 mt-0.5">
                      {verifyEmail}
                    </p>
                  </div>

                  {/* OTP input boxes */}
                  <div
                    className="flex justify-center gap-2"
                    onPaste={handleOtpPaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        className={`w-11 h-13 text-center text-xl font-bold border-2 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none transition-colors
                          ${otpError
                            ? 'border-red-400 dark:border-red-500'
                            : digit
                            ? 'border-primary-500'
                            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500'
                          }`}
                        style={{ height: '52px' }}
                      />
                    ))}
                  </div>

                  {otpError && (
                    <p className="text-center text-sm text-red-500 dark:text-red-400">{otpError}</p>
                  )}

                  <Button
                    type="button"
                    className="w-full"
                    onClick={verifyCode}
                    isLoading={verifyingCode}
                  >
                    Verify Code
                  </Button>

                  {/* Resend */}
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400">
                    Didn&apos;t receive the code?{' '}
                    {resendCooldown > 0 ? (
                      <span className="text-gray-400">Resend in {resendCooldown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={sendCode}
                        disabled={sendingCode}
                        className="text-primary-600 dark:text-primary-400 font-medium hover:underline disabled:opacity-50"
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>
              )}

              {/* ── Step: Verified success ── */}
              {verifyStep === 'verified' && (
                <div className="text-center space-y-5">
                  <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Email Verified!</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your account is now active. Please log in to continue.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => { setVerifyStep('idle'); setOtp(['','','','','','']); }}
                  >
                    Go to Login →
                  </Button>
                </div>
              )}
            </div>

          ) : (
            /* ══ LOGIN FORM ══════════════════════════════════════════════════════ */
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
                  <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading} disabled={isOffline || isLoading}>
                {isOffline ? 'Sign In (No Internet)' : 'Sign In'}
              </Button>

              {/* Verify email shortcut */}
              <div className="pt-1 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                  Email not verified yet?{' '}
                  <button
                    type="button"
                    onClick={() => { setVerifyEmail(formData.email); setVerifyStep('send'); }}
                    className="text-primary-600 dark:text-primary-400 font-medium hover:underline"
                  >
                    Verify now
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Bottom link */}
          {!isVerifyMode && (
            <div className="mt-5 text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
