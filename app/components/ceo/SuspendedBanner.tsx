'use client';

import { useAuth } from '@/lib/workstation/auth-context';

export default function SuspendedBanner() {
  const { accountStatus } = useAuth();
  if (accountStatus !== 'suspended') return null;

  return (
    <div
      className="flex items-start gap-3 px-4 py-3 text-[13px] font-medium"
      style={{
        background: 'linear-gradient(90deg, #fee2e2 0%, #fef2f2 100%)',
        borderBottom: '1.5px solid #fca5a5',
        color: '#991b1b',
      }}
    >
      {/* Warning icon */}
      <svg
        className="mt-px flex-shrink-0"
        width="16" height="16" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>

      <span>
        <strong>Account Suspended.</strong>{' '}
        Your account has been temporarily suspended. Clock-in is disabled. Please contact your manager or HR for assistance.
      </span>
    </div>
  );
}
