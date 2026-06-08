'use client';

import { useState, useEffect, useRef } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FiMail, FiLock, FiEye, FiEyeOff, FiWifiOff, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
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

  // ── OTP state ────────────────────────────────────────────────────────────────
  const [verifyStep, setVerifyStep] = useState<VerifyStep>('idle');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // ── Resend cooldown ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // ── Login ────────────────────────────────────────────────────────────────────
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
        if (
          result.error.includes('verify your email') ||
          result.error.includes('Please verify') ||
          result.error === 'Please verify your email before logging in'
        ) {
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

  // ── OTP: send code ────────────────────────────────────────────────────────────
  const sendCode = async () => {
    if (!verifyEmail) { toast.error('Please enter your email.'); return; }
    setSendingCode(true);
    setOtpError('');
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifyEmail }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed to send code.'); return; }
      toast.success('Code sent! Check your email.');
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setVerifyStep('code');
      setResendCooldown(60);
      // Focus first box after render
      setTimeout(() => inputRefs.current[0]?.focus(), 150);
    } catch {
      toast.error('Network error. Please try again.');
    } finally {
      setSendingCode(false);
    }
  };

  // ── OTP: digit input handling ─────────────────────────────────────────────────
  const handleDigitChange = (index: number, value: string) => {
    // Accept only single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setOtpError('');
    // Auto-advance to next box
    if (digit && index < 5) {
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 10);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (otp[index]) {
        // Clear current
        const next = [...otp];
        next[index] = '';
        setOtp(next);
      } else if (index > 0) {
        // Move to previous
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle paste of full 6-digit code (very common on mobile)
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const digits = pasted.split('');
      const next = ['', '', '', '', '', ''];
      digits.forEach((d, i) => { if (i < 6) next[i] = d; });
      setOtp(next);
      setOtpError('');
      // Focus last filled box or next empty one
      const focusIndex = Math.min(pasted.length, 5);
      setTimeout(() => inputRefs.current[focusIndex]?.focus(), 10);
    }
  };

  // ── OTP: verify code ──────────────────────────────────────────────────────────
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
        setOtpError(data.error || 'Invalid code. Please try again.');
        if (res.status === 410) {
          // Code expired — go back to send step
          toast.error('Code expired. Please request a new one.');
          setVerifyStep('send');
          setOtp(['', '', '', '', '', '']);
        }
        return;
      }
      setVerifyStep('verified');
      toast.success('Email verified! You can now log in. 🎉');
    } catch {
      setOtpError('Network error. Please try again.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const resetVerify = () => {
    setVerifyStep('idle');
    setOtp(['', '', '', '', '', '']);
    setOtpError('');
    setResendCooldown(0);
  };

  const isVerifyMode = verifyStep !== 'idle';
  const otpComplete = otp.every(d => d !== '');

  // ── RENDER ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4 py-8">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4 shadow-lg shadow-primary-500/30">
            <span className="text-white text-2xl font-bold">V</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {isVerifyMode ? 'Verify Your Email' : 'Welcome Back'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {isVerifyMode
              ? verifyStep === 'code'
                ? `Code sent to ${verifyEmail}`
                : 'Enter your email to get a verification code'
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
                Sign in requires internet. If already logged in, use a dashboard link below.
              </p>
              <div className="mt-3 flex gap-2 flex-wrap">
                <button onClick={() => router.push('/vendor/dashboard')} className="text-xs font-semibold bg-yellow-600 text-white px-3 py-1.5 rounded-lg">Vendor Dashboard</button>
                <button onClick={() => router.push('/farmer/dashboard')} className="text-xs font-semibold bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg">Farmer Dashboard</button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 md:p-8">

          {/* ══ VERIFY MODE ════════════════════════════════════════════════════════ */}
          {isVerifyMode ? (
            <div>
              {/* Back button */}
              <button
                onClick={resetVerify}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 mb-6 transition-colors -ml-1"
              >
                <FiArrowLeft className="w-4 h-4" />
                <span>Back to login</span>
              </button>

              {/* ── Step 1: Enter email & request code ── */}
              {verifyStep === 'send' && (
                <div className="space-y-5">
                  {/* Warning banner */}
                  <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
                      📧 Email not verified
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                      We&apos;ll send a 6-digit code to your email. Enter it to activate your account.
                    </p>
                  </div>

                  {/* Email input */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                      <input
                        type="email"
                        value={verifyEmail}
                        onChange={(e) => setVerifyEmail(e.target.value)}
                        placeholder="your@email.com"
                        autoComplete="email"
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
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

              {/* ── Step 2: Enter OTP code ── */}
              {verifyStep === 'code' && (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-3">
                      <FiMail className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enter the 6-digit code sent to
                    </p>
                    <p className="text-sm font-bold text-primary-600 dark:text-primary-400 mt-0.5 break-all">
                      {verifyEmail}
                    </p>
                  </div>

                  {/* ── 6 OTP Digit Boxes ── */}
                  <div
                    className="flex justify-center gap-2 sm:gap-3"
                    onPaste={handlePaste}
                  >
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        autoComplete={i === 0 ? 'one-time-code' : 'off'}
                        onChange={(e) => handleDigitChange(i, e.target.value)}
                        onKeyDown={(e) => handleDigitKeyDown(i, e)}
                        onFocus={(e) => e.target.select()}
                        className={`
                          flex-1 min-w-0 text-center text-2xl font-bold border-2 rounded-xl
                          bg-white dark:bg-gray-700
                          text-gray-900 dark:text-white
                          focus:outline-none transition-all duration-150
                          touch-manipulation select-none
                          ${otpError
                            ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/20'
                            : digit
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600 focus:border-primary-500 focus:bg-primary-50 dark:focus:bg-primary-900/20'
                          }
                        `}
                        style={{ height: '60px', fontSize: '1.5rem' }}
                      />
                    ))}
                  </div>

                  {/* Error message */}
                  {otpError && (
                    <p className="text-center text-sm text-red-500 dark:text-red-400 font-medium">
                      ⚠️ {otpError}
                    </p>
                  )}

                  {/* Verify button */}
                  <Button
                    type="button"
                    className="w-full"
                    onClick={verifyCode}
                    isLoading={verifyingCode}
                    disabled={!otpComplete || verifyingCode}
                  >
                    {otpComplete ? 'Verify Code ✓' : `Enter ${6 - otp.filter(Boolean).length} more digit${6 - otp.filter(Boolean).length === 1 ? '' : 's'}`}
                  </Button>

                  {/* Resend */}
                  <div className="text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Didn&apos;t receive the code?{' '}
                    </p>
                    <div className="mt-1">
                      {resendCooldown > 0 ? (
                        <span className="text-sm text-gray-400 dark:text-gray-500">
                          Resend available in <strong>{resendCooldown}s</strong>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={sendCode}
                          disabled={sendingCode}
                          className="text-sm text-primary-600 dark:text-primary-400 font-semibold hover:underline disabled:opacity-50"
                        >
                          {sendingCode ? 'Sending…' : 'Resend Code'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Verified ── */}
              {verifyStep === 'verified' && (
                <div className="text-center space-y-5 py-2">
                  <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                    <FiCheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                      Email Verified! 🎉
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your account is now active. Tap below to log in.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={resetVerify}
                  >
                    Go to Login →
                  </Button>
                </div>
              )}
            </div>

          ) : (
            /* ══ LOGIN FORM ════════════════════════════════════════════════════════ */
            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label="Email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                placeholder="your@email.com"
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
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff className="w-5 h-5" /> : <FiEye className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
                </label>
                <Link href="/auth/forgot-password" className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full"
                isLoading={isLoading}
                disabled={isOffline || isLoading}
              >
                {isOffline ? 'No Internet' : 'Sign In'}
              </Button>

              {/* Verify shortcut */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Email not verified?{' '}
                  <button
                    type="button"
                    onClick={() => { setVerifyEmail(formData.email); setVerifyStep('send'); }}
                    className="text-primary-600 dark:text-primary-400 font-semibold hover:underline"
                  >
                    Verify now
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Sign up link */}
          {!isVerifyMode && (
            <div className="mt-5 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Don&apos;t have an account?{' '}
                <Link href="/auth/signup" className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold">
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
