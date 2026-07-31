'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeMonthlySummary, monthId } from '@/modules/time-tracking/services';
import type { MonthlySummaryDoc } from '@/modules/time-tracking/types';
import ClockWidget from '@/modules/time-tracking/components/ClockWidget';
import MonthlyCalendar from '@/modules/time-tracking/components/MonthlyCalendar';
import TeamOverview from '@/modules/time-tracking/components/TeamOverview';
import { SkeletonTimeTracking } from '@/components/Skeleton';

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

type TTTab = 'overview' | 'goals' | 'reports';

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */

const STAT_CARDS = [
  { label:'Total Hours',        value:'1,248', unit:'',   iconBg:'#dbeafe', iconColor:'#2563eb', icon:<ClockIcon /> },
  { label:'Overtime Hours',     value:'32',    unit:'',   iconBg:'#fef3c7', iconColor:'#d97706', icon:<ClockIcon /> },
  { label:'Average Hours/Week', value:'38.5',  unit:'',   iconBg:'#d1fae5', iconColor:'#059669', icon:<CalIcon />   },
  { label:'Productivity',       value:'94',    unit:'%',  iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<PersonIcon /> },
];

const PIE_SLICES = [
  { label:'Project 1', pct:35, color:'#3b82f6',
    d:'M 60 60 L 60 10 A 50 50 0 0 1 100.45 89.39 Z' },
  { label:'Project 2', pct:25, color:'#f5bd02',
    d:'M 60 60 L 100.45 89.39 A 50 50 0 0 1 30.61 100.45 Z' },
  { label:'Project 3', pct:25, color:'#22c55e',
    d:'M 60 60 L 30.61 100.45 A 50 50 0 0 1 19.55 30.61 Z' },
  { label:'Internal',  pct:15, color:'#ec4899',
    d:'M 60 60 L 19.55 30.61 A 50 50 0 0 1 60 10 Z' },
];

const GOALS = [
  {
    icon: <TrophyIcon />,
    iconColor: '#f5bd02',
    iconBg: '#fef9c3',
    title: 'Punctuality Pro',
    desc: 'Logged 30 consecutive days on time.',
    progress: 100,
    barColor: '#22c55e',
    status: 'Completed',
    statusColor: '#15803d',
    locked: false,
  },
  {
    icon: <RocketIcon />,
    iconColor: '#3b82f6',
    iconBg: '#dbeafe',
    title: 'Productivity Pioneer',
    desc: 'Log 40 hours for 4 straight weeks.',
    progress: 75,
    barColor: '#f5bd02',
    status: '3 of 4 weeks completed',
    statusColor: '#92400e',
    locked: false,
  },
  {
    icon: <LockIcon />,
    iconColor: '#9ca3af',
    iconBg: '#f3f4f6',
    title: 'Overtime Champion',
    desc: 'Log 10 hours of overtime in a month.',
    progress: 0,
    barColor: '#d1d5db',
    status: 'Locked',
    statusColor: '#9ca3af',
    locked: true,
  },
];


/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function TimeTrackingPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<TTTab>('overview');
  const [summary, setSummary] = useState<MonthlySummaryDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeMonthlySummary(user.uid, monthId(), s => { setSummary(s); setLoading(false); });
  }, [user?.uid]);

  const TABS: { key: TTTab; label: string; icon: React.ReactNode }[] = [
    { key:'overview', label:'Overview',            icon:<ClockTabIcon />   },
    { key:'goals',    label:'Goals & Achievements', icon:<TrophyTabIcon />  },
    { key:'reports',  label:'Reports',              icon:<ChartTabIcon />   },
  ];

  if (loading || !user?.uid) return <SkeletonTimeTracking />;

  return (
    <div className="p-4 md:p-5">

      {/* ── Header ── */}
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Time Tracking</h1>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">Monitor staff working hours and productivity</p>
      </div>

      {/* ── Tabs ── */}
      <div className="mb-5 flex border-b border-gray-200 dark:border-white/6">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-[12px] font-medium transition-colors
              ${tab === t.key
                ? 'border-b-2 border-[#f5bd02] text-[#f5bd02]'
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
          >
            <span className={tab === t.key ? 'text-[#f5bd02]' : 'text-gray-400'}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div className="flex flex-col gap-5">

          {/* Clock-in widget + monthly calendar */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="lg:col-span-1"><ClockWidget /></div>
            <div className="lg:col-span-2"><MonthlyCalendar uid={user.uid} summary={summary} /></div>
          </div>

          <TeamOverview />

          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STAT_CARDS.map(s => (
              <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
                <div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">
                    {s.value}<span className="text-[14px]">{s.unit}</span>
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: s.iconBg, color: s.iconColor }}
                >
                  {s.icon}
                </div>
              </div>
            ))}
          </div>

          {/* Pie chart card */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-4 text-[14px] font-bold text-gray-800 dark:text-white">Project Time Distribution</h2>
            <div className="flex flex-col items-center gap-6 sm:flex-row">
              <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
                {PIE_SLICES.map((s, i) => (
                  <path key={i} d={s.d} fill={s.color} />
                ))}
              </svg>
              <div className="flex flex-col gap-2.5">
                {PIE_SLICES.map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className="h-3 w-3 flex-shrink-0 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[12px] text-gray-600 dark:text-gray-300">
                      {s.label} ({s.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Goals section */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span style={{ color: '#f5bd02' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 .5l1.8 4.1 4.5.4-3.3 2.9 1 4.4L8 10.1l-4 2.2 1-4.4L1.7 5l4.5-.4L8 .5z"/>
                </svg>
              </span>
              <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">My Goals and Achievements</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {GOALS.map(g => (
                <GoalCard key={g.title} goal={g} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── GOALS ── */}
      {tab === 'goals' && (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Track your personal performance milestones.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {GOALS.map(g => (
              <GoalCard key={g.title} goal={g} />
            ))}
          </div>
        </div>
      )}

      {/* ── REPORTS ── */}
      {tab === 'reports' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-4 text-[14px] font-bold text-gray-800 dark:text-white">Weekly Hours Report</h2>
            <WeeklyBars />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-3 text-[14px] font-bold text-gray-800 dark:text-white">Monthly Summary</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label:'Days Worked',   value: String(summary?.totalDaysWorked ?? 0) },
                { label:'Days Absent',   value: String(summary?.daysAbsent.length ?? 0) },
                { label:'Total Hours',   value: `${(summary?.totalHoursWorked ?? 0).toFixed(1)}h` },
                { label:'Avg Clock-In',  value: summary?.averageClockIn || '-' },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-gray-50 p-4 dark:bg-[#2a2a2a]">
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                  <p className="mt-1 text-[20px] font-bold text-gray-800 dark:text-white">{s.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   GOAL CARD
══════════════════════════════════════════════════════════════════════════ */

interface GoalProps {
  goal: {
    icon: React.ReactNode; iconColor: string; iconBg: string;
    title: string; desc: string; progress: number;
    barColor: string; status: string; statusColor: string; locked: boolean;
  };
}

function GoalCard({ goal: g }: GoalProps) {
  return (
    <div className={`flex flex-col items-center rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e] ${g.locked ? 'opacity-70' : ''}`}>
      <div
        className="mb-3 flex h-12 w-12 items-center justify-center rounded-full"
        style={{ backgroundColor: g.iconBg, color: g.iconColor }}
      >
        {g.icon}
      </div>
      <p className="text-center text-[13px] font-bold text-gray-800 dark:text-white">{g.title}</p>
      <p className="mt-1 text-center text-[11px] leading-snug text-gray-500 dark:text-gray-400">{g.desc}</p>
      <div className="my-3 h-2 w-full rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${g.progress}%`, backgroundColor: g.barColor }}
        />
      </div>
      <p className="text-[11px] font-semibold" style={{ color: g.statusColor }}>{g.status}</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WEEKLY BARS (Reports tab)
══════════════════════════════════════════════════════════════════════════ */

function WeeklyBars() {
  const days = [
    { day:'Mon', hours:8.5 },
    { day:'Tue', hours:9.2 },
    { day:'Wed', hours:7.8 },
    { day:'Thu', hours:10.1 },
    { day:'Fri', hours:8.0 },
  ];
  const max = Math.max(...days.map(d => d.hours));
  return (
    <div className="flex items-end justify-around gap-3">
      {days.map(d => {
        const pct = (d.hours / (max + 1)) * 100;
        return (
          <div key={d.day} className="flex flex-col items-center gap-1.5">
            <span className="text-[10px] text-gray-400">{d.hours}h</span>
            <div className="w-10 rounded-t-lg" style={{ height: `${pct * 0.8}px`, backgroundColor: '#f5bd02' }} />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">{d.day}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════════ */

function ClockIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
}
function CalIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function PersonIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>;
}
function TrophyIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9H3V4h3M18 9h3V4h-3M12 17v4M8 21h8M7 4h10v6a5 5 0 0 1-10 0V4z"/></svg>;
}
function RocketIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2C6.5 9 6 13 6 16l6 4 6-4c0-3-.5-7-6-14z"/><line x1="12" y1="20" x2="12" y2="22"/><path d="M8 16s-2 1-2 3M16 16s2 1 2 3"/></svg>;
}
function LockIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
}

/* Tab icons */
function ClockTabIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>;
}
function TrophyTabIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9H3V4h3M18 9h3V4h-3M7 4h10v6a5 5 0 0 1-10 0V4z"/></svg>;
}
function ChartTabIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
}
