'use client';

import type { ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   TRENDORA — Project Executive Dashboard
   E-Commerce & Retail Platform. Static mock data, matches approved design.
═══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: 'Revenue (MTD)',    value: '$580,000', trend: '+5.3% vs June',        up: true,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <DollarIcon /> },
  { label: 'Orders (MTD)',     value: '3,841',     trend: '+61 orders today',     up: true,  iconBg: '#dbeafe', iconColor: '#2563eb', icon: <PackageIcon /> },
  { label: 'Active Products',  value: '12,450',    trend: '84 added this month',  up: true,  iconBg: '#ede9fe', iconColor: '#7c3aed', icon: <BoxIcon /> },
  { label: 'Total Customers',  value: '48,210',    trend: '+1,240 new this month',up: true,  iconBg: '#fce7f3', iconColor: '#db2777', icon: <PeopleIcon /> },
  { label: 'Conversion Rate',  value: '3.8%',       trend: '+0.4% vs last month',  up: true,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <TrendIcon /> },
  { label: 'Inventory Health', value: '91%',        trend: '1,108 items low stock',up: false, iconBg: '#dbeafe', iconColor: '#2563eb', icon: <BoxIcon /> },
  { label: 'Refund Requests',  value: '2',          trend: 'Pending resolution',   up: false, iconBg: '#fee2e2', iconColor: '#dc2626', icon: <RefreshIcon /> },
  { label: 'Active Campaigns', value: '5',          trend: '2 ending this week',   up: null,  iconBg: '#ccfbf1', iconColor: '#0d9488', icon: <MegaphoneIcon /> },
];

const REVENUE_TREND = { months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'], revenue: [3100, 3400, 3700, 4000, 4300, 4600] };

const TOP_PRODUCTS = [
  { label: 'iPhone 17 Pro-Max',      units: 850 },
  { label: 'Samsung S21',            units: 720 },
  { label: 'Laptop',                 units: 600 },
  { label: 'iPhone 17 Cases',        units: 520 },
  { label: 'Phone Accessories Pack', units: 470 },
];

const RECENT_ORDERS = [
  { id: 'TRD-10258', customer: 'Amaka Okafor', amount: '₦128,000',   status: 'Completed' as const },
  { id: 'TRD-10257', customer: 'Rashida Bello', amount: '₦45,000.0', status: 'Processing' as const },
  { id: 'TRD-10256', customer: 'Ngozi Chuks',   amount: '₦91,000.00',status: 'Processing' as const },
  { id: 'TRD-10254', customer: 'Emmanuel E.',   amount: '₦38,000.00',status: 'Refund' as const },
];

const REFUND_REQUESTS = [
  { name: 'Emmanuel Eze',  item: 'Fashion Accessories Pack', reason: 'Wrong item delivered', amount: '₦38,000' },
  { name: 'Taiwo Adegoke', item: 'Home Decor Collection',    reason: 'Damaged on arrival',    amount: '₦62,000' },
];

const STATUS_STYLE: Record<string, string> = {
  Completed: 'bg-[#dcfce7] text-[#16a34a]',
  Processing: 'bg-[#dbeafe] text-[#2563eb]',
  Refund: 'bg-[#fee2e2] text-[#dc2626]',
};

export default function TrendoraPage() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <PageHeader />
      <StatsGrid />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RevenueTrendCard />
        <TopProductsCard />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RecentOrdersCard />
        <RefundRequestsCard />
      </div>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#dcfce7] text-[#16a34a]">
          <BagIcon size={18} />
        </div>
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">Trendora</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">E-Commerce &amp; Retail Platform — Executive Dashboard</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <HeaderBtn label="Add Product" icon={<PlusIcon />} />
        <HeaderBtn label="View Orders" />
        <HeaderBtn label="Marketing" />
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
          ? 'bg-[#16a34a] text-white hover:opacity-90 font-semibold'
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

/* ── Monthly Revenue Trend ─────────────────────────────────────────────── */

function RevenueTrendCard() {
  const W = 560, H = 200, PAD_L = 40, PAD_B = 24, PAD_T = 10;
  const chartW = W - PAD_L - 8, chartH = H - PAD_T - PAD_B;
  const maxY = 6000;
  const n = REVENUE_TREND.months.length;
  const x = (i: number) => PAD_L + (chartW * i) / (n - 1);
  const y = (v: number) => PAD_T + chartH - (chartH * v) / maxY;
  const linePts = REVENUE_TREND.revenue.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${x(0)},${y(0)} ${linePts} ${x(n - 1)},${y(0)}`;
  const yTicks = [0, 1500, 3000, 4500, 6000];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Monthly Revenue Trend</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Revenue growth over the past 6 months</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full">
        <defs>
          <linearGradient id="trendora-rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD_L} y1={y(t)} x2={W - 8} y2={y(t)} stroke="currentColor" className="text-gray-100 dark:text-white/10" />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-gray-400">${(t / 1000).toFixed(1)}K</text>
          </g>
        ))}
        {REVENUE_TREND.months.map((m, i) => (
          <text key={m} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" className="fill-gray-400">{m}</text>
        ))}
        <polygon points={areaPts} fill="url(#trendora-rev-fill)" />
        <polyline points={linePts} fill="none" stroke="#22c55e" strokeWidth="2" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22c55e]" /> Revenue</span>
      </div>
    </div>
  );
}

/* ── Top 5 Selling Products ────────────────────────────────────────────── */

function TopProductsCard() {
  const maxV = 1000;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Top 5 Selling Products</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Units sold this month</p>
      <div className="mt-4 space-y-3">
        {TOP_PRODUCTS.map(p => (
          <div key={p.label}>
            <div className="mb-1 flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300">
              <span className="truncate font-medium">{p.label}</span>
              <span className="flex-shrink-0 text-gray-400">{p.units}</span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
              <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${(p.units / maxV) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Recent Orders ──────────────────────────────────────────────────────── */

function RecentOrdersCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Recent Orders</p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-gray-400">
              <th className="pb-2 font-medium">Order ID</th>
              <th className="pb-2 font-medium">Customer</th>
              <th className="pb-2 font-medium">Amount</th>
              <th className="pb-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ORDERS.map(o => (
              <tr key={o.id} className="border-t border-gray-100 dark:border-white/10">
                <td className="py-2 text-gray-500 dark:text-gray-400">{o.id}</td>
                <td className="py-2 font-medium text-gray-800 dark:text-white">{o.customer}</td>
                <td className="py-2 text-gray-700 dark:text-gray-200">{o.amount}</td>
                <td className="py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[o.status]}`}>{o.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Refund Requests ────────────────────────────────────────────────────── */

function RefundRequestsCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Refund Requests</p>
        <span className="rounded-full bg-[#fee2e2] px-2 py-0.5 text-[10px] font-semibold text-[#dc2626]">{REFUND_REQUESTS.length} pending</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {REFUND_REQUESTS.map((r, i) => (
          <div key={i} className="rounded-lg bg-[#fef2f2] p-2.5 dark:bg-red-500/10">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{r.name}</p>
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{r.item}</p>
                <p className="truncate text-[11px] text-red-500">{r.reason}</p>
              </div>
              <span className="flex-shrink-0 text-[12px] font-semibold text-red-600">{r.amount}</span>
            </div>
            <div className="mt-2 flex gap-1.5">
              <button className="rounded-md bg-[#16a34a] px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90">Approve Refund</button>
              <button className="rounded-md border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-gray-300">Investigate</button>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">
        View All Refunds
      </button>
    </div>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function DollarIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function PackageIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27,6.96 12,12.01 20.73,6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}
function BoxIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>;
}
function PeopleIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function TrendIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,6 13.5,15.5 8.5,10.5 1,18" /><polyline points="17,6 23,6 23,12" /></svg>;
}
function RefreshIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23,4 23,10 17,10" /><polyline points="1,20 1,14 7,14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>;
}
function MegaphoneIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v3a1 1 0 0 0 1 1h1l3 6h2l-2-6h4l6 4V6l-6 4H5a1 1 0 0 0-1 1z" /><path d="M8 11v4" /></svg>;
}
function BagIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
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
