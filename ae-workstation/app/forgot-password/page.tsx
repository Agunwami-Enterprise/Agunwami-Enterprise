'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AuthPageShell from '@/components/AuthPageShell';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
      // Intentionally swallow — always redirect to sent page to avoid email enumeration
    } finally {
      setLoading(false);
      router.push(`/forgot-password/sent?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <AuthPageShell>
      <div
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}
      >
        {/* Gold top bar */}
        <div style={{ height: 42, backgroundColor: '#f5bd02' }} />

        {/* Card body */}
        <div className="px-8 pt-5 pb-8 dark:bg-[#1e1e1e]" style={{ backgroundColor: '#f5f5f5' }}>
          {/* Back + heading */}
          <div className="flex items-center gap-2 mb-6">
            <Link href="/login" className="text-gray-400 hover:text-gray-600 transition dark:hover:text-gray-300">
              <ChevronLeftIcon />
            </Link>
            <h2 className="font-bold" style={{ fontSize: 17, color: '#f5bd02' }}>
              Reset Password
            </h2>
          </div>

          {/* Mail icon */}
          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center rounded-xl bg-white dark:bg-[#2a2a2a]"
              style={{ width: 52, height: 52, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}
            >
              <MailIcon />
            </div>
          </div>

          {/* Description */}
          <p
            className="text-center mb-5 dark:text-gray-400"
            style={{ fontSize: 13, color: '#9ca3af', lineHeight: '20px' }}
          >
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                <MailIconSmall />
              </span>
              <input
                type="email"
                placeholder="Enter your email address"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border bg-white pl-10 pr-3.5 py-2.5 text-[13px] text-gray-700 placeholder-gray-400 outline-none transition focus:border-[#f5bd02] focus:ring-1 focus:ring-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
                style={{ borderColor: '#e5e7eb', lineHeight: '20px' }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-[11px] text-[14px] font-semibold transition hover:opacity-90 active:opacity-75 disabled:opacity-60"
              style={{ backgroundColor: '#f5bd02', color: '#1a1a1a' }}
            >
              {loading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        </div>
      </div>
    </AuthPageShell>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f5bd02" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}
function MailIconSmall() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="2,4 12,13 22,4" />
    </svg>
  );
}
