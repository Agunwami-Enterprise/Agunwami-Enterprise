'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════════
   MCS — Project Executive Dashboard
   Meridian Crest Solutions — Job Platform & HR Solutions. Static mock data.
═══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: 'Companies Registered',  value: '318',    trend: '+12 this month',       up: true, iconBg: '#dbeafe', iconColor: '#2563eb', icon: <BuildingIcon /> },
  { label: 'Active Job Listings',   value: '1,042',  trend: '4 pending review',      up: null, iconBg: '#fef3c7', iconColor: '#d97706', icon: <BriefcaseIcon /> },
  { label: 'Monthly Active Users',  value: '12,804', trend: '28,410 total users',    up: true, iconBg: '#ede9fe', iconColor: '#7c3aed', icon: <PeopleIcon /> },
  { label: 'Applications Submitted',value: '4,790',  trend: 'July 2026 (MTD)',       up: true, iconBg: '#dcfce7', iconColor: '#16a34a', icon: <DocIcon /> },
  { label: 'Messages Exchanged',    value: '18,240', trend: 'Employer–Applicant',    up: true, iconBg: '#dbeafe', iconColor: '#2563eb', icon: <ChatIcon /> },
  { label: 'Notifications Sent',    value: '41,800', trend: 'This month',            up: true, iconBg: '#ccfbf1', iconColor: '#0d9488', icon: <BellIcon /> },
  { label: 'Security Status',       value: 'Secure', trend: '2 events resolved today', up: true, iconBg: '#dcfce7', iconColor: '#16a34a', icon: <ShieldIcon /> },
  { label: 'Server Health',         value: '99.7%',  trend: 'Uptime this month',     up: true, iconBg: '#ccfbf1', iconColor: '#0d9488', icon: <ServerIcon /> },
];

const APPS_TREND = {
  months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  applications: [2900, 3200, 3500, 3900, 4300, 4790],
  jobListings: [900, 930, 960, 990, 1020, 1042],
};

const SECTOR_PIE = [
  { label: 'Technology',    pct: 31, color: '#3b82f6' },
  { label: 'Finance',       pct: 20, color: '#22c55e' },
  { label: 'Healthcare',    pct: 16, color: '#f97316' },
  { label: 'Manufacturing', pct: 14, color: '#8b5cf6' },
  { label: 'Education',     pct: 12, color: '#d97706' },
  { label: 'Others',        pct: 7,  color: '#9ca3af' },
];

const RECENT_ACTIVITY = [
  { name: 'Sarah J',       detail: 'Viewed document', time: '10:00:09 AM · 11/18/2025', iconBg: '#ede9fe', color: '#7c3aed', icon: <DocIcon /> },
  { name: 'Michael Chima', detail: 'Updated task status', time: '9:59:44 AM · 11/18/2025', iconBg: '#dcfce7', color: '#16a34a', icon: <CheckIcon /> },
  { name: 'Michael Chima', detail: 'Updated task status', time: '9:59:36 AM · 11/18/2025', iconBg: '#dcfce7', color: '#16a34a', icon: <CheckIcon /> },
  { name: 'Mike',          detail: 'Logged work hours', time: '9:58:27 AM · 11/18/2025', iconBg: '#f3f4f6', color: '#6b7280', icon: <PulseIcon /> },
];

const CONTENT_REVIEW_QUEUE = [
  { title: 'Frontend Developer — Remote', company: 'NovaTech Ltd', submitted: '2h ago' },
  { title: 'Sales Associate — Lagos',     company: 'Trendora',     submitted: '5h ago' },
  { title: 'Company profile update',      company: 'Meridian Crest Solutions', submitted: '1d ago' },
  { title: 'HR Coordinator (Intern)',     company: 'Agunwami Enterprise', submitted: '1d ago' },
];

export default function McsPage() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <PageHeader />
      <StatsGrid />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <TrendCard />
        <SectorPieCard />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RecentActivityCard />
        <ContentReviewCard />
      </div>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#dbeafe] text-[#2563eb]">
          <BuildingIcon size={18} />
        </div>
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">Meridian Crest Solutions</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Job Platform &amp; HR Solutions — Executive Dashboard</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HeaderBtn label="Manage Companies" />
        <Link href="/ceo/job-listings" className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-white/5">
          <BriefcaseIcon size={13} /> Job Listings
        </Link>
        <HeaderBtn label="Approve Content" />
        <HeaderBtn label="Security" icon={<ShieldIcon size={13} />} />
        <HeaderBtn label="Reports" icon={<ChartBarIcon />} primary />
      </div>
    </div>
  );
}

function HeaderBtn({ label, icon, primary = false }: { label: string; icon?: ReactNode; primary?: boolean }) {
  return (
    <button
      className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium ${
        primary
          ? 'bg-[#2563eb] text-white hover:opacity-90 font-semibold'
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

/* ── Applications & Job Listings Trend ────────────────────────────────── */

function TrendCard() {
  const W = 560, H = 200, PAD_L = 40, PAD_B = 24, PAD_T = 10;
  const chartW = W - PAD_L - 8, chartH = H - PAD_T - PAD_B;
  const maxY = 6000;
  const n = APPS_TREND.months.length;
  const x = (i: number) => PAD_L + (chartW * i) / (n - 1);
  const y = (v: number) => PAD_T + chartH - (chartH * v) / maxY;
  const appPts = APPS_TREND.applications.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const listingPts = APPS_TREND.jobListings.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${x(0)},${y(0)} ${appPts} ${x(n - 1)},${y(0)}`;
  const yTicks = [0, 1500, 3000, 4500, 6000];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Applications &amp; Job Listings Trend</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">6-month growth in applications and active postings</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <defs>
          <linearGradient id="mcs-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD_L} y1={y(t)} x2={W - 8} y2={y(t)} stroke="currentColor" className="text-gray-100 dark:text-white/10" />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-gray-400">{t}</text>
          </g>
        ))}
        {APPS_TREND.months.map((m, i) => (
          <text key={m} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" className="fill-gray-400">{m}</text>
        ))}
        <polygon points={areaPts} fill="url(#mcs-trend-fill)" />
        <polyline points={appPts} fill="none" stroke="#3b82f6" strokeWidth="2" />
        <polyline points={listingPts} fill="none" stroke="#f5bd02" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Applications</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f5bd02]" /> Job Listings</span>
      </div>
    </div>
  );
}

/* ── Companies by Industry Sector (pie) ───────────────────────────────── */

function SectorPieCard() {
  const R = 80, CX = 100, CY = 100;
  let cumulative = 0;
  const slices = SECTOR_PIE.map(s => {
    const startAngle = (cumulative / 100) * 360;
    cumulative += s.pct;
    const endAngle = (cumulative / 100) * 360;
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x1 = CX + R * Math.cos(toRad(startAngle));
    const y1 = CY + R * Math.sin(toRad(startAngle));
    const x2 = CX + R * Math.cos(toRad(endAngle));
    const y2 = CY + R * Math.sin(toRad(endAngle));
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return { ...s, d: `M${CX},${CY} L${x1.toFixed(2)},${y1.toFixed(2)} A${R},${R} 0 ${largeArc} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z` };
  });

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Companies by Industry Sector</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Distribution of registered employers</p>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <svg width="180" height="180" viewBox="0 0 200 200">
          {slices.map(s => <path key={s.label} d={s.d} fill={s.color} />)}
        </svg>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px] text-gray-600 dark:text-gray-300">
          {slices.map(s => (
            <span key={s.label} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} /> {s.label} {s.pct}%
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Recent Platform Activity ─────────────────────────────────────────── */

function RecentActivityCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Recent Platform Activity</p>
      <div className="mt-3 space-y-2.5">
        {RECENT_ACTIVITY.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: a.iconBg, color: a.color }}>
              {a.icon}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{a.name}</p>
              <p className="truncate text-[11px] text-gray-400">{a.detail}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-gray-400">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Content Review Queue ──────────────────────────────────────────────── */

function ContentReviewCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Content Review Queue</p>
        <span className="rounded-full bg-[#dbeafe] px-2 py-0.5 text-[10px] font-semibold text-[#2563eb]">{CONTENT_REVIEW_QUEUE.length} items</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {CONTENT_REVIEW_QUEUE.map((c, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{c.title}</p>
              <p className="truncate text-[11px] text-gray-400">{c.company} · {c.submitted}</p>
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
              <button className="rounded-md bg-[#2563eb] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">Approve</button>
              <button className="rounded-md border border-gray-200 px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">View</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function BuildingIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 22V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v18" /><path d="M6 12h12" /><path d="M2 22h20" /><path d="M9 6h1M14 6h1M9 10h1M14 10h1M9 16h1M14 16h1" /></svg>;
}
function BriefcaseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
}
function PeopleIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function DocIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /></svg>;
}
function ChatIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function BellIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
function ShieldIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}
function ServerIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>;
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>;
}
function PulseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>;
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
