'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/workstation/firebase';
import AuthPageShell from '@/app/components/ceo/AuthPageShell';

/* ─── Inner component that reads search params (must be in Suspense) ─── */
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Show reason-based messages from redirect (e.g. ?reason=fired from auth-context)
  useEffect(() => {
    const reason = searchParams.get('reason');
    if (reason === 'fired') {
      setError(
        'Your employment has been terminated. You cannot access the workstation. ' +
        'Please contact the CEO for more information.'
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const user = credential.user;

      // Verify Firestore user record
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const accountStatus = userData.accountStatus ?? 'active';
          const role = userData.role || 'staff';
          const dept = userData.department || '';

          // Block fired users immediately at login
          if (accountStatus === 'fired') {
            await signOut(auth);
            throw new Error(
              'Your employment has been terminated. You cannot access the workstation. ' +
              'Please contact the CEO for more information.'
            );
          }

          if (role !== 'staff') {
            await signOut(auth);
            throw new Error('Unauthorized: Workstation access is restricted to staff members.');
          }

          const validDepts = ['ceo', 'operations', 'operation', 'opm', 'hr', 'content-admin', 'content-staff'];
          if (dept && !validDepts.includes(dept)) {
            await signOut(auth);
            throw new Error('Unauthorized: Department not recognized.');
          }

          // Suspended users: allowed to log in — the app will show the banner
          // No block here, just proceed
        }
      } catch (err: any) {
        if (err.message?.includes('Unauthorized') || err.message?.includes('terminated') || err.message?.includes('suspended')) {
          throw err;
        }
      }

      const idToken = await user.getIdToken();

      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to create session');
      }

      router.push('/ceo/dashboard');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg  = (err as { message?: string }).message ?? '';
      if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        setError('Invalid email or password.');
      } else if (code === 'auth/user-disabled') {
        setError('This account has been disabled. Please contact the CEO.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/Password sign-in is not enabled.');
      } else if (msg) {
        setError(msg);
      } else {
        setError('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  // Classify error: terminated errors get a distinct style
  const isTerminatedError = error.toLowerCase().includes('terminated') || error.toLowerCase().includes('disabled');

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
              <Link href="/auth/forgot-password" className="font-medium hover:underline" style={{ fontSize: 11, color: '#f5bd02' }}>
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
              <div
                className={`rounded-lg px-3 py-2.5 text-[12px] leading-snug ${
                  isTerminatedError
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}
              >
                {isTerminatedError && (
                  <p className="mb-1 font-semibold text-[11px] uppercase tracking-wide">Account Disabled</p>
                )}
                {error}
              </div>
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

/* ─── Page wrapper with Suspense (required for useSearchParams) ─── */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
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
