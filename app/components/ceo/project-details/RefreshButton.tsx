'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';

/** Re-reads the project's metrics endpoint now instead of the cached copy. */
export default function RefreshButton({ color }: { color: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => router.replace(`${pathname}?refresh=${Date.now()}`))}
      className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:brightness-110 disabled:opacity-70"
      style={{ backgroundColor: color }}
    >
      <RefreshCw className={`h-4 w-4 ${pending ? 'animate-spin' : ''}`} aria-hidden="true" />
      {pending ? 'Refreshing…' : 'Refresh'}
    </button>
  );
}
