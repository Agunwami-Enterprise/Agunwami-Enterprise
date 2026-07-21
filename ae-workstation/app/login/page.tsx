'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AuthPageShell from '@/components/AuthPageShell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'session');
      }

      const { role } = await res.json();
      router.push(roleToPath(role));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = (err as { message?: string }).message ?? '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled in Firebase Console.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell>
      <div
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}
      >
        <div className="bg-white px-8 pt-6 pb-7 dark:bg-[#1e1e1e]">
          <h2 className="text-center font-semibold mb-[14px]" style={{ fontSize: 15, color: '#f5bd02' }}>
            Welcome Back
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[10px]">
            <input
              type="email"
              placeholder="Enter your email address"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-[14px] py-[10px] text-[13px] text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#f5bd02] focus:ring-1 focus:ring-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
              style={{ borderColor: '#e5e7eb', lineHeight: '20px' }}
            />

            <div className="flex justify-end -mt-[2px]">
              <Link href="/forgot-password" className="font-medium hover:underline" style={{ fontSize: 11, color: '#f5bd02' }}>
                Forgot Password?
              </Link>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border px-[14px] py-[10px] pr-10 text-[13px] text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#f5bd02] focus:ring-1 focus:ring-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
                style={{ borderColor: '#e5e7eb', lineHeight: '20px' }}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500 transition"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-[12px] text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-[2px] w-full rounded-lg py-[11px] text-[14px] font-semibold text-white transition hover:opacity-90 active:opacity-75 disabled:opacity-60"
              style={{ backgroundColor: '#f5bd02', color: '#1a1a1a' }}
            >
              {loading ? 'Logging in…' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </AuthPageShell>
  );
}

function roleToPath(role: string): string {
  switch (role) {
    case 'ceo':     return '/ceo/dashboard';
    case 'manager': return '/manager/dashboard';
    case 'staff':   return '/staff/dashboard';
    default:        return '/ceo/dashboard';
  }
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
