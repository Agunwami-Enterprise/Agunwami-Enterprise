'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { subscribeDashboard } from '@/modules/dashboard/services';
import { SkeletonDashboard } from '@/app/components/ceo/Skeleton';
import ClockWidget from '@/modules/time-tracking/components/ClockWidget';

/* ═══════════════════════════════════════════════════════════════════════════
   CEO DASHBOARD PAGE
   Static mock data — wired to real Firestore in Stage 3.
═══════════════════════════════════════════════════════════════════════════ */

export default function DashboardPage() {
  const [liveStats, setLiveStats] = useState<{ totalStaff: number; pendingApprovals: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => subscribeDashboard(
    s => { setLiveStats({ totalStaff: s.totalStaff, pendingApprovals: s.pendingApprovals }); setLoading(false); },
    () => setLoading(false),
  ), []);

  const stats = STATS.map(s => {
    if (s.label === 'Total Workforce' && liveStats) return { ...s, value: String(liveStats.totalStaff) };
    if (s.label === 'CEO Approvals'   && liveStats) return { ...s, value: String(liveStats.pendingApprovals) };
    return s;
  });

  if (loading) return <SkeletonDashboard />;

  return (
    <div className="space-y-4 p-4 md:p-5">
      <HeroBanner />
      <StatsRow stats={stats} />
      <MiddleRow />
      <BottomRow />
      <RecentActivity />
    </div>
  );
}

/* ── 1. Hero Banner ────────────────────────────────────────────────────── */

function HeroBanner() {
  return (
    <div
      className="flex flex-col justify-between gap-3 rounded-2xl p-5 sm:flex-row sm:items-center"
      style={{ background: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)' }}
    >
      <div>
        <h1 className="text-[18px] font-bold leading-tight text-white">CEO Executive Dashboard</h1>
        <p className="mt-0.5 text-[12px] text-white/80">Strategic Leadership &amp; Company Performance Overview</p>
      </div>
      <LiveClock />
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!now) return null;
  return (
    <div className="text-left sm:text-right">
      <p className="text-[20px] font-bold tabular-nums text-white">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-[12px] text-white/80">
        {now.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' })}
      </p>
    </div>
  );
}

/* ── 2. Stats row ──────────────────────────────────────────────────────── */

const STATS = [
  { label: 'Company Revenue', value: '$2.4M',  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <DollarIcon /> },
  { label: 'Total Workforce', value: '47',      iconBg: '#dbeafe', iconColor: '#2563eb', icon: <PeopleIcon /> },
  { label: 'Growth Rate',     value: '+12.5%',  iconBg: '#ccfbf1', iconColor: '#0d9488', icon: <TrendIcon />  },
  { label: 'CEO Approvals',   value: '8',       iconBg: '#fee2e2', iconColor: '#dc2626', icon: <ApprovalIcon /> },
];

function StatsRow({ stats }: { stats: typeof STATS }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map(s => (
        <div key={s.label} className="flex items-start justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
            <p className="mt-1 text-[22px] font-bold text-gray-800 dark:text-white">{s.value}</p>
          </div>
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: s.iconBg, color: s.iconColor }}
          >
            {s.icon}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── 3. Middle row: Time Tracking | Dept Pie | Attendance ─────────────── */

function MiddleRow() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <ClockWidget />
      <DeptPieCard />
      <AttendanceCard />
    </div>
  );
}

/* SVG Pie Chart — raw, no library */
const DEPT_DATA = [
  { name: 'Engineering', short: 'Eng.', value: 45, color: '#1e3a5f' },
  { name: 'Sales',       short: 'Sales', value: 20, color: '#f5bd02' },
  { name: 'Support',     short: 'Sup.',  value: 20, color: '#0ea5e9' },
  { name: 'HR',          short: 'HR',    value: 8,  color: '#f97316' },
  { name: 'Marketing',   short: 'Mkt.',  value: 7,  color: '#8b5cf6' },
];

function DeptPieCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="mb-2 text-[13px] font-semibold text-gray-700 dark:text-gray-200">Department Distribution</p>
      <DeptPieChart />
    </div>
  );
}

function DeptPieChart() {
  const VW = 260, VH = 190;
  const cx = 110, cy = 92, r = 62;
  const outerR = r + 12, labelR = r + 26;

  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const pt = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(toRad(angle)),
    y: cy + radius * Math.sin(toRad(angle)),
  });

  const total = DEPT_DATA.reduce((s, d) => s + d.value, 0);
  let cum = 0;
  const slices = DEPT_DATA.map(d => {
    const span = (d.value / total) * 360;
    const start = cum, end = cum + span, mid = cum + span / 2;
    cum = end;
    return { ...d, start, end, mid };
  });

  function pathD(start: number, end: number) {
    const s = pt(start, r), e = pt(end, r);
    const large = end - start > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`;
  }

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} width="100%" style={{ maxHeight: 190 }}>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={pathD(s.start, s.end)} fill={s.color} />
          <line
            x1={pt(s.mid, r + 2).x.toFixed(1)} y1={pt(s.mid, r + 2).y.toFixed(1)}
            x2={pt(s.mid, outerR).x.toFixed(1)} y2={pt(s.mid, outerR).y.toFixed(1)}
            stroke="#d1d5db" strokeWidth="0.7"
          />
          <text
            x={pt(s.mid, labelR).x.toFixed(1)}
            y={pt(s.mid, labelR).y.toFixed(1)}
            textAnchor={pt(s.mid, 1).x >= cx ? 'start' : 'end'}
            fontSize="8" fill="#6b7280" dominantBaseline="middle"
          >
            {s.short} {s.value}%
          </text>
        </g>
      ))}
    </svg>
  );
}

/* Attendance mini-calendar */
function AttendanceCard() {
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => setToday(new Date()), []);

  if (!today) return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]" />
  );

  const year      = today.getFullYear();
  const month     = today.getMonth();
  const todayDate = today.getDate();

  // Monday-based first weekday of month (0=Mon … 6=Sun)
  const rawFirst  = new Date(year, month, 1).getDay();
  const firstMon  = rawFirst === 0 ? 6 : rawFirst - 1;

  // Previous month fill
  const prevTotal = new Date(year, month, 0).getDate();
  const prevFill  = Array.from({ length: firstMon }, (_, i) => prevTotal - firstMon + 1 + i);

  // Show exactly 2 rows of cells (14 total)
  const currentCount = 14 - firstMon;
  const currentDays  = Array.from({ length: currentCount }, (_, i) => i + 1);

  // Mock: days before today that were attended
  const attended = new Set([1, 2, 3, 6].filter(d => d < todayDate));

  const monthName = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Attendance</p>
          <p className="text-[10px] text-gray-400">{monthName}</p>
        </div>
        <button className="text-[11px] font-medium text-[#f5bd02] hover:underline">Full History</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['M','T','W','T','F','S','S'].map((d, i) => (
          <div key={i} className="flex items-center justify-center py-1">
            <span className="text-[10px] font-semibold text-gray-400">{d}</span>
          </div>
        ))}

        {/* Prev month fill */}
        {prevFill.map((d, i) => (
          <div key={`p${i}`} className="flex items-center justify-center py-0.5">
            <span className="flex h-6 w-6 items-center justify-center text-[10px] text-gray-300 dark:text-gray-600">{d}</span>
          </div>
        ))}

        {/* Current month days */}
        {currentDays.map(d => {
          const isToday    = d === todayDate;
          const isAttended = attended.has(d);
          return (
            <div key={d} className="flex items-center justify-center py-0.5">
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium transition-colors cursor-default
                  ${isToday
                    ? 'bg-[#f5bd02] text-white font-bold'
                    : isAttended
                      ? 'bg-[#22c55e] text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6'
                  }`}
              >
                {String(d).padStart(2, '0')}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex justify-between text-[11px] text-gray-500 dark:text-gray-400">
        <span>Lateness: <strong className="text-gray-700 dark:text-gray-200">0m</strong></span>
        <span>Overtime: <strong className="text-gray-700 dark:text-gray-200">2.5h</strong></span>
      </div>
    </div>
  );
}

/* ── 4. Bottom row: Weekly Activity | Recent Tasks | Quick Actions ─────── */

function BottomRow() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <WeeklyActivityCard />
      <RecentTasksCard />
      <QuickActionsCard />
    </div>
  );
}

/* SVG Line Chart — raw, no library */
const WEEKLY = [
  { day: 'Mon', v: 8 }, { day: 'Tue', v: 7 }, { day: 'Wed', v: 9 },
  { day: 'Thu', v: 7 }, { day: 'Fri', v: 6.5 },
];

function WeeklyActivityCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="mb-3 text-[13px] font-semibold text-gray-700 dark:text-gray-200">Weekly Activity</p>
      <WeeklyLineChart />
    </div>
  );
}

function WeeklyLineChart() {
  const W = 220, H = 120, pL = 28, pR = 8, pT = 8, pB = 22;
  const cW = W - pL - pR, cH = H - pT - pB;
  const MIN = 0, MAX = 12;
  const YTICKS = [0, 3, 6, 9, 12];

  const toX = (i: number) => pL + (i / (WEEKLY.length - 1)) * cW;
  const toY = (v: number) => pT + cH - ((v - MIN) / (MAX - MIN)) * cH;

  const pts = WEEKLY.map((d, i) => ({ x: toX(i), y: toY(d.v), day: d.day }));
  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%">
      {YTICKS.map(t => (
        <g key={t}>
          <line x1={pL} y1={toY(t).toFixed(1)} x2={W - pR} y2={toY(t).toFixed(1)}
            stroke="#f3f4f6" strokeWidth="1" />
          <text x={pL - 4} y={toY(t).toFixed(1)} textAnchor="end" fontSize="8"
            fill="#9ca3af" dominantBaseline="middle">{t}</text>
        </g>
      ))}
      <polyline points={polyline} fill="none" stroke="#f5bd02" strokeWidth="2" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x.toFixed(1)} cy={p.y.toFixed(1)} r="3" fill="#f5bd02" />
      ))}
      {pts.map((p, i) => (
        <text key={i} x={p.x.toFixed(1)} y={H - 4} textAnchor="middle" fontSize="8" fill="#9ca3af">{p.day}</text>
      ))}
    </svg>
  );
}

/* Recent Tasks */
const TASKS = [
  { icon: 'clock',   title: 'Update staff portal UI',    sub: 'Due: Today',     done: false, bg: '#ffffff' },
  { icon: 'message', title: 'Review payment requests',   sub: 'Due: Tomorrow',  done: false, bg: '#ffffff' },
  { icon: 'check',   title: 'Team meeting preparation',  sub: 'Completed',      done: true,  bg: '#f0fdf4' },
];

function RecentTasksCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
          <ClockSvg /> Recent Tasks
        </div>
        <span className="rounded-full bg-[#f5bd02]/15 px-2 py-0.5 text-[10px] font-semibold text-[#b38600]">
          5 Active
        </span>
      </div>
      <div className="space-y-2">
        {TASKS.map((t, i) => (
          <div key={i} className="flex items-start gap-2.5 rounded-xl p-2.5" style={{ backgroundColor: t.bg }}>
            <div className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full
              ${t.done ? 'bg-green-100 text-green-600' : 'bg-[#f5bd02]/15 text-[#b38600]'}`}>
              {t.done
                ? <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="2,6 5,9 10,3"/></svg>
                : t.icon === 'clock'
                  ? <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="6" r="5"/><polyline points="6,3 6,6 8,8"/></svg>
                  : <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M11 7a2 2 0 0 1-2 2H4l-3 2V3a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4z"/></svg>
              }
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold text-gray-700">{t.title}</p>
              <p className={`text-[11px] ${t.done ? 'text-green-600' : 'text-gray-400'}`}>{t.sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Quick Actions */
const QUICK_ACTIONS = [
  { icon: <EyeIcon />,    label: 'View Reports',  href: '/ceo/analytics'  },
  { icon: <TeamIcon />,   label: 'Manage Team',   href: '/ceo/staff'      },
  { icon: <SendIcon />,   label: 'Send Message',  href: '/ceo/messages'   },
  { icon: <GradIcon />,   label: 'Training',      href: '/ceo/training'   },
  { icon: <CalIcon />,    label: 'Calendar',      href: '#'               },
];

function QuickActionsCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-gray-700 dark:text-gray-200">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#f5bd02" strokeWidth="2" strokeLinecap="round">
          <polygon points="13,3 3,8 13,13 10,8"/>
        </svg>
        Quick Actions
      </div>
      <div className="space-y-2">
        {QUICK_ACTIONS.map(a => (
          <Link
            key={a.label}
            href={a.href}
            className="flex items-center gap-2.5 rounded-xl bg-[#fef9c3] px-3 py-2.5 text-[12px] font-medium text-gray-700 transition hover:opacity-80 dark:bg-[#2d2500] dark:text-gray-200"
          >
            <span className="text-gray-600">{a.icon}</span>
            {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── 5. Recent Activity ────────────────────────────────────────────────── */

const ACTIVITY = [
  { text: 'Task completed: Update knowledge base', time: '2 minutes ago',  color: '#22c55e' },
  { text: 'New message from Sarah Johnson',        time: '15 minutes ago', color: '#3b82f6' },
  { text: 'Payment request submitted',             time: '1 hour ago',     color: '#f5bd02' },
];

function RecentActivity() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="mb-3 text-[13px] font-semibold text-gray-700 dark:text-gray-200">Recent Activity</p>
      <div className="space-y-3">
        {ACTIVITY.map((a, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="mt-1.5 h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
            <div>
              <p className="text-[13px] font-medium text-gray-700">{a.text}</p>
              <p className="text-[11px] text-gray-400">{a.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Shared mini SVG icons ───────────────────────────────────────────────── */

function ClockSvg() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6.5"/><polyline points="8,4.5 8,8 10.5,10"/></svg>;
}
function DollarIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="8" y1="1.5" x2="8" y2="14.5"/><path d="M11 4H6.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H5"/></svg>;
}
function PeopleIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="5" r="2.5"/><path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4"/><circle cx="12" cy="5" r="2"/><path d="M10.5 13.5c.3-1.5 1.2-2.5 3-3"/></svg>;
}
function TrendIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="1,11 5,7 9,9 15,3"/><polyline points="11,3 15,3 15,7"/></svg>;
}
function ApprovalIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7,10 11,6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function EyeIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/><circle cx="8" cy="8" r="2.2"/></svg>;
}
function TeamIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="6" cy="5" r="2.2"/><path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4"/><circle cx="12" cy="5" r="1.8"/><path d="M10.5 13c.3-1.5 1.2-2.5 3-3"/></svg>;
}
function SendIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><polygon points="14,2 2,7 7,9 9,14"/><line x1="7" y1="9" x2="14" y2="2"/></svg>;
}
function GradIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="8,2 15,6 8,10 1,6"/><path d="M4 8.5v3.5c0 1 2 2 4 2s4-1 4-2v-3.5"/><line x1="15" y1="6" x2="15" y2="10"/></svg>;
}
function CalIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="1.5" y="2.5" width="13" height="12" rx="1.5"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/><line x1="1.5" y1="6.5" x2="14.5" y2="6.5"/></svg>;
}
