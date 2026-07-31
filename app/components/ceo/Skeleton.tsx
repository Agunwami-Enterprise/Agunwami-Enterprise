/* Skeleton primitives + per-page skeleton layouts */

function Skel({ className = '' }: { className?: string }) {
  return <div className={`shimmer rounded-lg ${className}`} />;
}

function StatCard() {
  return (
    <div className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2.5">
          <Skel className="h-3 w-24" />
          <Skel className="h-7 w-16" />
          <Skel className="h-2.5 w-20" />
        </div>
        <Skel className="h-9 w-9 flex-shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function TableRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  const widths = ['w-36', 'w-24', 'w-20', 'w-20', 'w-16'];
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r} className="border-b border-gray-50 dark:border-white/4">
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} className="px-4 py-3.5">
              <Skel className={`h-3 ${widths[c] ?? 'w-16'}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ListRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-50 dark:divide-white/4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-4">
          <Skel className="h-9 w-9 flex-shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skel className="h-3 w-48" />
            <Skel className="h-2.5 w-64" />
          </div>
          <Skel className="h-2.5 w-16 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}

/* ── Dashboard ─────────────────────────────────────────────────────────── */
export function SkeletonDashboard() {
  return (
    <div className="space-y-4 p-4">
      {/* Hero banner */}
      <Skel className="h-24 w-full rounded-2xl" />

      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skel className="h-44 rounded-2xl" />
        <Skel className="h-44 rounded-2xl" />
        <Skel className="h-44 rounded-2xl" />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skel className="h-52 rounded-2xl" />
        <Skel className="h-52 rounded-2xl" />
        <Skel className="h-52 rounded-2xl" />
      </div>

      {/* Recent activity */}
      <div className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
        <Skel className="mb-4 h-4 w-36" />
        <ListRows rows={4} />
      </div>
    </div>
  );
}

/* ── Staff ─────────────────────────────────────────────────────────────── */
export function SkeletonStaff() {
  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-32" />
        <Skel className="h-9 w-36 rounded-xl" />
      </div>
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-white/8">
        {['w-20', 'w-28', 'w-28'].map((w, i) => <Skel key={i} className={`mb-2 h-3.5 ${w}`} />)}
      </div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Filter row */}
      <div className="flex gap-3">
        <Skel className="h-9 flex-1 rounded-xl" />
        <Skel className="h-9 w-32 rounded-xl" />
        <Skel className="h-9 w-32 rounded-xl" />
      </div>
      {/* Member cards grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
            <div className="flex items-center gap-3">
              <Skel className="h-12 w-12 flex-shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skel className="h-3.5 w-28" />
                <Skel className="h-2.5 w-20" />
              </div>
            </div>
            <div className="mt-3 space-y-2">
              <Skel className="h-2.5 w-full" />
              <Skel className="h-2.5 w-3/4" />
            </div>
            <div className="mt-3 flex gap-2">
              <Skel className="h-7 flex-1 rounded-lg" />
              <Skel className="h-7 flex-1 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tasks ─────────────────────────────────────────────────────────────── */
export function SkeletonTasks() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-24" />
        <Skel className="h-9 w-28 rounded-xl" />
      </div>
      {/* 5 stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Search + table */}
      <Skel className="h-9 w-full rounded-xl" />
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
        {/* Tab bar placeholder */}
        <div className="flex gap-2 border-b border-gray-100 px-4 py-2 dark:border-white/6">
          {['w-24', 'w-28', 'w-28', 'w-32'].map((w, i) => (
            <Skel key={i} className={`h-8 ${w} rounded-lg`} />
          ))}
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/6">
              {['w-28', 'w-20', 'w-20', 'w-16', 'w-16'].map((w, i) => (
                <th key={i} className="px-4 py-3">
                  <Skel className={`h-3 ${w}`} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRows rows={6} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Messages ──────────────────────────────────────────────────────────── */
export function SkeletonMessages() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header — mirrors p-4 pb-3 */}
      <div className="shrink-0 p-4 pb-3">
        <Skel className="h-5 w-28" />
        <Skel className="mt-1.5 h-3 w-52" />
      </div>
      {/* Tab pills — mirrors px-4 pb-3 */}
      <div className="shrink-0 px-4 pb-3">
        <div className="flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-[#1a1a1a]">
          {['flex-1','flex-1','flex-1','flex-1'].map((_, i) => (
            <Skel key={i} className="h-8 flex-1 rounded-lg" />
          ))}
        </div>
      </div>
      {/* 2-panel — mirrors min-h-0 flex-1 px-4 pb-4 */}
      <div className="flex min-h-0 flex-1 px-4 pb-4">
        <div className="flex w-full overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
          {/* Left sidebar — 260px */}
          <div className="w-[260px] shrink-0 border-r border-gray-100 dark:border-white/6">
            <div className="border-b border-gray-100 p-3 dark:border-white/6">
              <Skel className="h-8 w-full rounded-lg" />
            </div>
            <div className="border-b border-gray-100 px-3 py-2.5 dark:border-white/6">
              <Skel className="h-3 w-20" />
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-3">
                <Skel className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Skel className="h-2.5 w-24" />
                    <Skel className="h-2 w-12" />
                  </div>
                  <Skel className="h-2.5 w-32" />
                </div>
              </div>
            ))}
          </div>
          {/* Right panel */}
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <Skel className="h-14 w-14 rounded-full" />
            <Skel className="h-3.5 w-36" />
            <Skel className="h-3 w-52" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Documents ─────────────────────────────────────────────────────────── */
export function SkeletonDocuments() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-28" />
        <Skel className="h-9 w-36 rounded-xl" />
      </div>
      <Skel className="h-9 w-full rounded-xl" />
      {/* Tabs */}
      <div className="flex gap-6 border-b border-gray-200 dark:border-white/8">
        {['w-8', 'w-16', 'w-12', 'w-20'].map((w, i) => <Skel key={i} className={`mb-2 h-3.5 ${w}`} />)}
      </div>
      {/* Folder grid */}
      <div>
        <Skel className="mb-3 h-4 w-20" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
              <Skel className="mx-auto mb-3 h-16 w-16 rounded-xl" />
              <Skel className="mx-auto h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
      {/* Files table */}
      <div className="rounded-2xl bg-white dark:bg-[#1e1e1e]">
        <div className="border-b border-gray-100 px-4 py-3 dark:border-white/6">
          <Skel className="h-4 w-16" />
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/6">
              {['w-40', 'w-16', 'w-20', 'w-24', 'w-16'].map((w, i) => (
                <th key={i} className="px-4 py-3"><Skel className={`h-3 ${w}`} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRows rows={5} cols={5} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Time Tracking ─────────────────────────────────────────────────────── */
export function SkeletonTimeTracking() {
  return (
    <div className="space-y-4 p-4">
      <Skel className="h-6 w-32" />
      {/* Icon tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-white/8">
        {['w-24', 'w-36', 'w-20', 'w-28'].map((w, i) => <Skel key={i} className={`mb-2 h-8 ${w} rounded-lg`} />)}
      </div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Pie chart + goal cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Skel className="h-56 rounded-2xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
            <div className="flex items-center gap-3">
              <Skel className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skel className="h-3 w-28" />
                <Skel className="h-2 w-full rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Records table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/6">
              {['w-24', 'w-20', 'w-20', 'w-16', 'w-20', 'w-16'].map((w, i) => (
                <th key={i} className="px-4 py-3"><Skel className={`h-3 ${w}`} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRows rows={5} cols={6} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Leave Requests ────────────────────────────────────────────────────── */
export function SkeletonLeaveRequests() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-36" />
        <Skel className="h-9 w-32 rounded-xl" />
      </div>
      {/* 3 stat cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-white/6">
              {['w-32', 'w-20', 'w-24', 'w-24', 'w-12', 'w-16', 'w-20'].map((w, i) => (
                <th key={i} className="px-4 py-3"><Skel className={`h-3 ${w}`} /></th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableRows rows={6} cols={7} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Notifications ─────────────────────────────────────────────────────── */
export function SkeletonNotifications() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-36" />
        <div className="flex gap-2">
          <Skel className="h-9 w-28 rounded-xl" />
          <Skel className="h-9 w-20 rounded-xl" />
        </div>
      </div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Tabs */}
      <div className="flex gap-2">
        <Skel className="h-9 w-32 rounded-full" />
        <Skel className="h-9 w-32 rounded-full" />
      </div>
      {/* Notification list */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
        {/* Toolbar */}
        <div className="flex gap-3 border-b border-gray-100 px-4 py-3 dark:border-white/6">
          <Skel className="h-8 flex-1 rounded-lg" />
          <Skel className="h-8 w-32 rounded-lg" />
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 border-b border-gray-100 px-4 py-2 dark:border-white/6">
          {['w-12', 'w-16', 'w-20', 'w-20', 'w-20'].map((w, i) => (
            <Skel key={i} className={`h-7 ${w} rounded-full`} />
          ))}
        </div>
        <ListRows rows={6} />
      </div>
    </div>
  );
}

/* ── Payments ──────────────────────────────────────────────────────────── */
export function SkeletonPayments() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-24" />
        <Skel className="h-9 w-32 rounded-xl" />
      </div>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Filter bar */}
      <div className="flex gap-3">
        <Skel className="h-9 flex-1 rounded-xl" />
        <Skel className="h-9 w-28 rounded-xl" />
        <Skel className="h-9 w-28 rounded-xl" />
        <Skel className="h-9 w-24 rounded-xl" />
      </div>
      {/* Payment list */}
      <div className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-gray-50 px-5 py-4 last:border-0 dark:border-white/4">
            <Skel className="h-10 w-10 flex-shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skel className="h-3.5 w-28" />
                <Skel className="h-5 w-16 rounded-full" />
              </div>
              <Skel className="h-2.5 w-52" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skel className="ml-auto h-4 w-20" />
              <Skel className="ml-auto h-2.5 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Training ──────────────────────────────────────────────────────────── */
export function SkeletonTraining() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-28" />
        <Skel className="h-9 w-40 rounded-xl" />
      </div>
      {/* 5 stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Search + filter */}
      <div className="flex gap-3">
        <Skel className="h-9 flex-1 rounded-xl" />
        <Skel className="h-9 w-36 rounded-xl" />
      </div>
      {/* Training card grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]">
            <Skel className="h-36 rounded-none" />
            <div className="space-y-2.5 p-4">
              <Skel className="h-2.5 w-20" />
              <Skel className="h-4 w-full" />
              <Skel className="h-3 w-28" />
              <div className="flex gap-1.5">
                <Skel className="h-5 w-16 rounded-full" />
                <Skel className="h-5 w-16 rounded-full" />
              </div>
              <Skel className="h-1.5 w-full rounded-full" />
              <Skel className="h-8 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Analytics ─────────────────────────────────────────────────────────── */
export function SkeletonAnalytics() {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skel className="h-6 w-24" />
        <div className="flex gap-2">
          <Skel className="h-9 w-24 rounded-xl" />
          <Skel className="h-9 w-24 rounded-xl" />
        </div>
      </div>
      {/* Live activity + filters */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
          <Skel className="mb-3 h-4 w-36" />
          <ListRows rows={4} />
        </div>
        <div className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
          <Skel className="mb-3 h-4 w-28" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skel key={i} className="h-9 w-full rounded-lg" />)}
            <Skel className="h-9 w-full rounded-xl" />
          </div>
        </div>
      </div>
      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCard key={i} />)}
      </div>
      {/* Chart tabs */}
      <div className="flex gap-2">
        {['w-28', 'w-20', 'w-24', 'w-32', 'w-24'].map((w, i) => (
          <Skel key={i} className={`h-8 ${w} rounded-full`} />
        ))}
      </div>
      {/* Charts */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Skel className="h-56 rounded-2xl" />
        <Skel className="h-56 rounded-2xl" />
      </div>
      <Skel className="h-56 w-full rounded-2xl" />
      {/* Performance list */}
      <div className="rounded-2xl bg-white p-4 dark:bg-[#1e1e1e]">
        <Skel className="mb-3 h-4 w-44" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skel className="h-8 w-8 flex-shrink-0 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skel className="h-3 w-32" />
                <Skel className="h-2 w-full rounded-full" />
              </div>
              <Skel className="h-3 w-10 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
