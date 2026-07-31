import Link from 'next/link';
import AuthPageShell from '@/components/AuthPageShell';

interface Props {
  searchParams: Promise<{ email?: string }>;
}

export default async function ForgotPasswordSentPage({ searchParams }: Props) {
  const { email } = await searchParams;

  return (
    <AuthPageShell>
      <div
        className="w-full overflow-hidden rounded-2xl"
        style={{ maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}
      >
        <div style={{ height: 42, backgroundColor: '#f5bd02' }} />

        <div className="px-8 pt-5 pb-8 dark:bg-[#1e1e1e]" style={{ backgroundColor: '#f5f5f5' }}>
          <div className="flex items-center gap-2 mb-6">
            <Link href="/auth/login" className="text-gray-400 hover:text-gray-600 transition dark:hover:text-gray-300">
              <ChevronLeftIcon />
            </Link>
            <h2 className="font-bold" style={{ fontSize: 17, color: '#f5bd02' }}>
              Reset Password
            </h2>
          </div>

          <div className="flex justify-center mb-4">
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 52, height: 52, backgroundColor: '#dcfce7' }}
            >
              <CheckCircleIcon />
            </div>
          </div>

          <p className="text-center font-bold mb-1 dark:text-white" style={{ fontSize: 15, color: '#1a1a1a' }}>
            Check Your Email
          </p>

          <p className="text-center mb-6 dark:text-gray-400" style={{ fontSize: 13, color: '#9ca3af', lineHeight: '20px' }}>
            If <span style={{ color: '#f5bd02' }}>{email ?? 'this email'}</span> is registered, you&apos;ll receive a reset link shortly.
            <br /><br />
            Click the link in the email to reset your password. The link will expire in 24 hours.
          </p>

          <Link
            href="/auth/login"
            className="flex w-full items-center justify-center rounded-lg py-2.75 text-[14px] font-semibold transition hover:opacity-90 active:opacity-75"
            style={{ backgroundColor: '#f5bd02', color: '#1a1a1a' }}
          >
            Back to Log In
          </Link>

          <Link
            href="/auth/forgot-password"
            className="mt-3 flex w-full items-center justify-center rounded-lg border py-2.75 text-[13px] font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4"
            style={{ borderColor: '#e5e7eb', backgroundColor: 'transparent' }}
          >
            Try a different email
          </Link>

          <p className="mt-4 text-center dark:text-gray-500" style={{ fontSize: 11, color: '#9ca3af', lineHeight: '18px' }}>
            Didn&apos;t receive an email? Check your spam folder or contact IT support.
          </p>
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
function CheckCircleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
