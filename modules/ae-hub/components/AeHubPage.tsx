'use client';

/* ═══════════════════════════════════════════════════════════════════════════
   AE HUB — Project Executive Dashboard
   E-Learning & EdTech Platform. Static mock data, matches approved design.
═══════════════════════════════════════════════════════════════════════════ */

const STATS = [
  { label: 'Student Registrations', value: '4,218',    trend: '+138 this month',    up: true,  iconBg: '#dbeafe', iconColor: '#2563eb', icon: <PeopleIcon /> },
  { label: 'Active Courses',        value: '62',        trend: '8 launched this month', up: true, iconBg: '#fef3c7', iconColor: '#d97706', icon: <BookIcon />   },
  { label: 'AI (Edwin) Sessions',   value: '12,804',    trend: '421 sessions today', up: true,  iconBg: '#ede9fe', iconColor: '#7c3aed', icon: <PulseIcon />  },
  { label: 'Live Classes Today',    value: '14',        trend: '6 in progress now',  up: null,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <VideoIcon />  },
  { label: 'Active Tutors',         value: '44',        trend: '3 pending approval', up: true,  iconBg: '#fef3c7', iconColor: '#d97706', icon: <StarIcon />   },
  { label: 'Completion Rate',       value: '78%',       trend: '+4% vs last month',  up: true,  iconBg: '#dcfce7', iconColor: '#16a34a', icon: <CheckIcon />  },
  { label: 'Monthly Revenue',       value: '$890,000',  trend: 'July 2026 (MTD)',    up: true,  iconBg: '#fef3c7', iconColor: '#b45309', icon: <DollarIcon /> },
  { label: 'Support Tickets',       value: '14',        trend: '3 unresolved >24h',  up: false, iconBg: '#fee2e2', iconColor: '#dc2626', icon: <ChatIcon />   },
];

const REG_TREND = {
  months: ['Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
  students: [3600, 3700, 3850, 4000, 4100, 4218],
  tutors: [38, 39, 40, 41, 43, 44],
};

const COMPLETION_BY_CATEGORY = [
  { label: 'Tech & Dev',  enrolled: 820, completed: 680 },
  { label: 'Business',    enrolled: 540, completed: 410 },
  { label: 'Design',      enrolled: 390, completed: 300 },
  { label: 'Languages',   enrolled: 260, completed: 190 },
  { label: 'Science',     enrolled: 310, completed: 230 },
];

const RECENT_ACTIVITY = [
  { name: 'Fatima Al-Hassan', action: 'Completed course',  detail: '"Advanced Python for Data Science"', time: '12m ago', iconBg: '#dcfce7', color: '#16a34a', icon: <CheckIcon /> },
  { name: 'Edwin (AI)',       action: 'Flagged low engagement', detail: '3 students in "UX Design Basics"', time: '38m ago', iconBg: '#ede9fe', color: '#7c3aed', icon: <PulseIcon /> },
  { name: 'David Okoro',      action: 'Launched new course',  detail: '"Intro to Cloud Computing"',   time: '1h ago',  iconBg: '#fef3c7', color: '#d97706', icon: <BookIcon /> },
  { name: 'Grace Nwosu',      action: 'Submitted support ticket', detail: '"Video playback issue"',     time: '2h ago',  iconBg: '#fee2e2', color: '#dc2626', icon: <ChatIcon /> },
];

const TUTOR_APPROVALS = [
  { name: 'Ahmed Bello',    subject: 'Mathematics', submitted: 'Today' },
  { name: 'Chiamaka Eze',   subject: 'Product Design', submitted: 'Yesterday' },
  { name: 'Samuel Johnson', subject: 'Backend Engineering', submitted: '2 days ago' },
];

export default function AeHubPage() {
  return (
    <div className="space-y-4 p-4 md:p-5">
      <PageHeader />
      <StatsGrid />
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RegistrationTrendCard />
        <CompletionByCategoryCard />
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <RecentActivityCard />
        <TutorApprovalsCard />
      </div>
    </div>
  );
}

/* ── Header ────────────────────────────────────────────────────────────── */

function PageHeader() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-[#d97706]">
          <BookIcon size={18} />
        </div>
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">AE Hub</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">E-Learning &amp; EdTech Platform — Executive Dashboard</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-gray-200 dark:hover:bg-white/5">
          <ChartBarIcon /> Analytics
        </button>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">
          <BellOutlineIcon /> Send Announcement
        </button>
      </div>
    </div>
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

/* ── Student Registration Trend ───────────────────────────────────────── */

function RegistrationTrendCard() {
  const W = 560, H = 200, PAD_L = 36, PAD_B = 24, PAD_T = 10;
  const chartW = W - PAD_L - 8, chartH = H - PAD_T - PAD_B;
  const maxY = 6000;
  const n = REG_TREND.months.length;
  const x = (i: number) => PAD_L + (chartW * i) / (n - 1);
  const y = (v: number) => PAD_T + chartH - (chartH * v) / maxY;

  const studentPts = REG_TREND.students.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const tutorPts = REG_TREND.tutors.map((v, i) => `${x(i)},${y(v)}`).join(' ');
  const areaPts = `${x(0)},${y(0)} ${studentPts} ${x(n - 1)},${y(0)}`;
  const yTicks = [0, 1500, 3000, 4500, 6000];

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Student Registration Trend</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Monthly new registrations and active tutors</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 w-full" style={{ height: 'auto' }}>
        <defs>
          <linearGradient id="ae-hub-reg-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5bd02" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#f5bd02" stopOpacity="0" />
          </linearGradient>
        </defs>
        {yTicks.map(t => (
          <g key={t}>
            <line x1={PAD_L} y1={y(t)} x2={W - 8} y2={y(t)} stroke="currentColor" className="text-gray-100 dark:text-white/10" />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" className="fill-gray-400">{t}</text>
          </g>
        ))}
        {REG_TREND.months.map((m, i) => (
          <text key={m} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" className="fill-gray-400">{m}</text>
        ))}
        <polygon points={areaPts} fill="url(#ae-hub-reg-fill)" />
        <polyline points={studentPts} fill="none" stroke="#f5bd02" strokeWidth="2" />
        <polyline points={tutorPts} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
      </svg>
      <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f5bd02]" /> Students</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#3b82f6]" /> Tutors</span>
      </div>
    </div>
  );
}

/* ── Course Completion by Category ────────────────────────────────────── */

function CompletionByCategoryCard() {
  const maxV = 1000;
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Course Completion by Category</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">Enrolled vs. completed per course category</p>
      <div className="mt-4 space-y-3">
        {COMPLETION_BY_CATEGORY.map(c => (
          <div key={c.label}>
            <p className="mb-1 text-[11px] font-medium text-gray-600 dark:text-gray-300">{c.label}</p>
            <div className="space-y-1">
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-[#f5bd02]" style={{ width: `${(c.enrolled / maxV) * 100}%` }} />
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
                <div className="h-full rounded-full bg-[#22c55e]" style={{ width: `${(c.completed / maxV) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f5bd02]" /> Enrolled</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#22c55e]" /> Completed</span>
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
              <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{a.name} <span className="font-normal text-gray-500 dark:text-gray-400">{a.action}</span></p>
              <p className="truncate text-[11px] text-gray-400">{a.detail}</p>
            </div>
            <span className="flex-shrink-0 text-[10px] text-gray-400">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tutor Approvals Pending ───────────────────────────────────────────── */

function TutorApprovalsCard() {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Tutor Approvals Pending</p>
        <span className="rounded-full bg-[#fef3c7] px-2 py-0.5 text-[10px] font-semibold text-[#b45309]">{TUTOR_APPROVALS.length} pending</span>
      </div>
      <div className="mt-3 space-y-2.5">
        {TUTOR_APPROVALS.map((t, i) => (
          <div key={i} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 p-2.5 dark:border-white/10">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-medium text-gray-800 dark:text-white">{t.name}</p>
              <p className="truncate text-[11px] text-gray-400">{t.subject} · Submitted {t.submitted}</p>
            </div>
            <div className="flex flex-shrink-0 gap-1.5">
              <button className="rounded-md bg-[#f5bd02] px-2.5 py-1 text-[11px] font-semibold text-[#1a1a1a] hover:opacity-90">Approve</button>
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
function BookIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>;
}
function PulseIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>;
}
function VideoIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23,7 16,12 23,17" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>;
}
function StarIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" /></svg>;
}
function CheckIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22,4 12,14.01 9,11.01" /></svg>;
}
function DollarIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
}
function ChatIcon({ size = 14 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}
function ArrowUpIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5,12 12,5 19,12" /></svg>;
}
function ArrowDownIcon() {
  return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><polyline points="5,12 12,19 19,12" /></svg>;
}
function ChartBarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
}
function BellOutlineIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>;
}
