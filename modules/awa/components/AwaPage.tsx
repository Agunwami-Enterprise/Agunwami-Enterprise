'use client';

import type { ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   AWA — Project Executive Dashboard
   Abia Women Assembly. Static mock data, matches approved design.
═══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: 'Total Members',        value: '2,140', trend: '+28 new registrations', up: true,  iconBg: '#fee2e2', iconColor: '#dc2626', icon: <PeopleIcon /> },
  { label: 'Upcoming Events',      value: '8',      trend: '2 this week',           up: null,  iconBg: '#dbeafe', iconColor: '#2563eb', icon: <CalendarIcon /> },
  { label: 'Donations Received',   value: '$1,500', trend: 'July 2026 (MTD)',       up: true,  iconBg: '#fce7f3', iconColor: '#db2777', icon: <HeartIcon /> },
  { label: 'Dept. Performance',    value: '86%',    trend: 'Avg across 5 depts',    up: true,  iconBg: '#ede9fe', iconColor: '#7c3aed', icon: <PulseIcon /> },
  { label: 'Leave Requests',       value: '3',      trend: 'Pending approval',      up: null,  iconBg: '#fef3c7', iconColor: '#d97706', icon: <ClockIcon /> },
  { label: 'Payroll Status',       value: 'Paid',   trend: 'July 2026 complete',    up: true,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <CardIcon /> },
  { label: 'Doc Approvals Pending',value: '7',      trend: 'Q2 reports, contracts', up: null,  iconBg: '#dbeafe', iconColor: '#2563eb', icon: <DocIcon /> },
  { label: 'Team Productivity',    value: '84%',    trend: '+2% vs June',           up: true,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <CheckIcon /> },
];

const DONATIONS = {
  months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  received: [650, 700, 750, 780, 800, 820],
  disbursed: [530, 600, 620, 660, 680, 700],
};

const SECTOR_RADAR_AXES = ['Programs', 'Finance', 'Outreach', 'Events', 'Admin'];
const SECTOR_SERIES = [
  { label: 'Productivity', color: '#f97316', fracs: [0.9, 0.75, 0.7, 0.6, 0.7] },
  { label: 'Engagement',   color: '#3b82f6', fracs: [0.75, 0.65, 0.6, 0.5, 0.6] },
];

const RECENT_ACTIVITY = [
  { detail: 'July payroll approved and disbursed — ₦2.1M to 84 members', time: '21m ago', iconBg: '#dcfce7', color: '#16a34a', icon: <DollarIcon /> },
  { detail: 'Annual Gala 2026 planning committee meeting scheduled — Aug 10', time: '21m ago', iconBg: '#dbeafe', color: '#2563eb', icon: <CalendarIcon /> },
  { detail: 'Leave request: Ngozi Adeyemi — 3 days annual leave pending approval', time: '1h 20m ago', iconBg: '#dbeafe', color: '#2563eb', icon: <CalendarIcon /> },
  { detail: '4 new member registrations from Lagos chapter', time: '2h ago', iconBg: '#fce7f3', color: '#db2777', icon: <HeartIcon /> },
  { detail: 'Q2 impact report submitted for board review', time: '3h ago', iconBg: '#fef3c7', color: '#d97706', icon: <DocIcon /> },
];

const LEAVE_REQUESTS = [
  { name: 'Leave Requests', dept: 'Programs · 3 days Annual Leave', submitted: 'Today' },
  { name: 'Fatima Bello',   dept: 'Finance · 2 days Sick Leave',     submitted: 'Yesterday' },
  { name: 'Adaeze Okonkwo', dept: 'Events · 5 days Annual Leave',    submitted: '2 days ago' },
];

export default function AwaPage() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <PageHeader />
      <StatsGrid />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <DonationsCard />
        <SectorRadarCard />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RecentActivityCard />
        <LeaveRequestsCard />
      </div>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fce7f3] text-[#db2777]">
          <HeartIcon size={18} />
        </div>
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">AWA</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Abia Women Assembly — Executive Dashboard</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HeaderBtn label="View Attendance" icon={<ClockIcon />} />
        <HeaderBtn label="Staff Management" icon={<PeopleIcon />} />
        <HeaderBtn label="Payroll" icon={<CardIcon />} />
        <HeaderBtn label="Reports" icon={<ChartBarIcon />} primary />
      </div>
    </div>
  );
}

function HeaderBtn({ label, icon, primary = false }: { label: string; icon: ReactNode; primary?: boolean }) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ${
        primary
          ? 'bg-[#f97316] text-white hover:opacity-90 font-semibold'
          : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-white/5'
      }`}
    >
      {icon} {label}
    </button>
  );
}

/* ── Stats grid ────────────────────────────────────────────────────────── */

function StatsGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATS.map(s => (
        <div key={s.label} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
              {s.icon}
            </div>
          </div>
          <p className="mt-1.5 text-[22px] font-bold text-gray-800 dark:text-white">{s.value}</p>
          <p className={`mt-1 flex items-center gap-1 text-[11px] ${s.up === true ? 'text-green-600' : s.up === false ? 'text-red-500' : 'text-gray-400'}`}>
            {s.up === true && <ArrowUpIcon />}
            {s.up === false && <ArrowDownIcon />}
            {s.trend}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── Donations Received vs Disbursed ──────────────────────────────────── */

function DonationsCard() {
  const W = 560, H = 200, PAD_L = 40, PAD_B = 24, PAD_T = 10;
  const chartW = W - PAD_L - 8, chartH = H - PAD_T - PAD_B;
  const maxY = 1000;
  const n = DONATIONS.months.length;
  const groupW = chartW / n;
  const barW = groupW * 0.28;
  const yTicks = [0, 250, 500, 750, 1000];
  const barY = (v: number) => PAD_T + chartH - (chartH * v) / maxY;
  const barH = (v: number) => (chartH * v) / maxY;

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Donations Received vs Disbursed</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">6-month comparison of donation flows</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD_L} y1={barY(t)} x2={W - 8} y2={barY(t)} stroke="currentColor" className="text-gray-100 dark:text-white/10" />
            <text x={PAD_L - 6} y={barY(t) + 3} textAnchor="end" fontSize="9" className="fill-gray-400">${t}</text>
          </g>
        ))}
        {DONATIONS.months.map((m, i) => {
          const gx = PAD_L + groupW * i;
          const cx = gx + groupW / 2;
          return (
            <g key={m}>
              <rect x={cx - barW - 2} y={barY(DONATIONS.received[i])} width={barW} height={barH(DONATIONS.received[i])} rx="2" fill="#f97316" />
              <rect x={cx + 2} y={barY(DONATIONS.disbursed[i])} width={barW} height={barH(DONATIONS.disbursed[i])} rx="2" fill="#22c55e" />
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="9" className="fill-gray-400">{m}</text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f97316]" /> Received</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22c55e]" /> Disbursed</span>
      </div>
    </div>
  );
}

/* ── Companies by Industry Sector (radar) ─────────────────────────────── */

function SectorRadarCard() {
  const CX = 120, CY = 110, R = 78;
  const axisCount = SECTOR_RADAR_AXES.length;
  const angleFor = (i: number) => (i * (360 / axisCount) - 90) * (Math.PI / 180);
  const pt = (i: number, frac: number) => ({
    x: CX + R * frac * Math.cos(angleFor(i)),
    y: CY + R * frac * Math.sin(angleFor(i)),
  });
  const gridFracs = [0.25, 0.5, 0.75, 1.0];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Companies by Industry Sector</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Distribution of registered employers</p>
      <div className="mt-2 flex justify-center">
        <svg width="240" height="220" viewBox="0 0 240 220">
          {gridFracs.map(f => (
            <polygon
              key={f}
              points={SECTOR_RADAR_AXES.map((_, i) => { const p = pt(i, f); return `${p.x},${p.y}`; }).join(' ')}
              fill="none" stroke="currentColor" className="text-gray-200 dark:text-white/10"
            />
          ))}
          {SECTOR_RADAR_AXES.map((label, i) => {
            const p = pt(i, 1.15);
            return <text key={label} x={p.x} y={p.y} textAnchor="middle" fontSize="9" className="fill-gray-500">{label}</text>;
          })}
          {SECTOR_SERIES.map(s => (
            <polygon
              key={s.label}
              points={s.fracs.map((f, i) => { const p = pt(i, f); return `${p.x},${p.y}`; }).join(' ')}
              fill={s.color} fillOpacity="0.15" stroke={s.color} strokeWidth="1.5"
            />
          ))}
        </svg>
      </div>
      <div className="mt-1 flex items-center justify-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        {SECTOR_SERIES.map(s => (
          <span key={s.label} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} /> {s.label}</span>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Activity ───────────────────────────────────────────────────── */

function RecentActivityCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Recent Activity</p>
      <div className="mt-3 space-y-2.5">
        {RECENT_ACTIVITY.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: a.iconBg, color: a.color }}>
              {a.icon}
            </div>
            <p className="min-w-0 flex-1 truncate text-[12px] text-gray-700 dark:text-gray-200">{a.detail}</p>
            <span className="flex-shrink-0 text-[10px] text-gray-400">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Leave Requests ────────────────────────────────────────────────────── */

function LeaveRequestsCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Leave Requests</p>
        <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">{LEAVE_REQUESTS.length} pending</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {LEAVE_REQUESTS.map((r, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{r.name}</p>
              <p className="truncate text-[11px] text-gray-400">{r.dept} · Submitted: {r.submitted}</p>
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
              <button className="rounded-md bg-[#f97316] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">Approve</button>
              <button className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function PeopleIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function CalendarIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
function HeartIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
}
function PulseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>;
}
function ClockIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>;
}
function CardIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>;
}
function DocIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>;
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>;
}
function DollarIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function ChartBarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function ArrowUpIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5,12 12,5 19,12" /></svg>;
}
function ArrowDownIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5,12 12,19 19,12" /></svg>;
}
