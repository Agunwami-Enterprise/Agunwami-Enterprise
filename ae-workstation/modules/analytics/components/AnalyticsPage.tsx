'use client';

import { useEffect, useState } from 'react';
import { SkeletonAnalytics } from '@/components/Skeleton';

type ReportTab = 'staff' | 'financial' | 'tasks' | 'development' | 'records';

const STAFF_PERF = [
  { name:'Sarah J',       productivity:82, rating:3.8 },
  { name:'Lisa R',        productivity:92, rating:4.6 },
  { name:'Michael C',     productivity:95, rating:4.8 },
  { name:'Mike Tutor',    productivity:85, rating:4.5 },
  { name:'Emily D',       productivity:88, rating:4.6 },
  { name:'Robert A',      productivity:82, rating:4.4 },
];

const PERF_METRICS = [
  { name:'Lisa R',        tasks:45, attendance:98, rating:'4.6/5.0', productivity:92  },
  { name:'Michael Chima', tasks:52, attendance:100,rating:'4.8/5.0', productivity:95  },
  { name:'Mike Tutor',    tasks:38, attendance:96, rating:'4.5/5.0', productivity:85  },
  { name:'Sarah J',       tasks:46, attendance:67, rating:'4.7/5.0', productivity:90  },
  { name:'Emily Davis',   tasks:41, attendance:96, rating:'4.6/5.0', productivity:88  },
  { name:'Robert Amadi',  tasks:35, attendance:93, rating:'4.4/5.0', productivity:82  },
];

const ACTIVITY_LOG = [
  { name:'Sarah J',      action:'Document', detail:'Shared document',     time:'10:00:00 AM · 17/8/2025', iconBg:'#dbeafe', initials:'SJ', color:'#3b82f6' },
  { name:'Michael Chima',action:'Task',     detail:'Updated task status',  time:'9:58 AM · 17/8/2025',    iconBg:'#dcfce7', initials:'MC', color:'#22c55e' },
  { name:'Michael Chima',action:'Task',     detail:'Updated task status',  time:'9:58 AM · 17/8/2025',    iconBg:'#dcfce7', initials:'MC', color:'#22c55e' },
  { name:'Mike',         action:'Other',    detail:'Logged work hours',    time:'9:58 AM · 17/8/2025',    iconBg:'#ede9fe', initials:'M',  color:'#8b5cf6' },
];

/* Radar chart points (hexagon, 6 axes) */
const RADAR_AXES  = ['Sales','Marketing','Support','Operations','Finance','IT'];
const RADAR_CX    = 120; const RADAR_CY = 120; const RADAR_R = 80;
function radarPt(axis: number, frac: number) {
  const angle = (axis * 60 - 90) * (Math.PI / 180);
  return { x: RADAR_CX + RADAR_R * frac * Math.cos(angle), y: RADAR_CY + RADAR_R * frac * Math.sin(angle) };
}
function pts(fracs: number[]) { return fracs.map((f,i) => radarPt(i,f)).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }
const radarSeriesData = [
  { fracs:[0.82,0.70,0.85,0.78,0.90,0.65], color:'#3b82f6', label:'Efficiency'   },
  { fracs:[0.70,0.80,0.72,0.85,0.74,0.80], color:'#f5bd02', label:'Engagement'   },
  { fracs:[0.88,0.75,0.82,0.70,0.86,0.72], color:'#22c55e', label:'Productivity' },
];
const radarGridFracs = [0.25,0.5,0.75,1.0];

/* ── Financial tab ── */
const MONTHLY_FINANCE = [
  { month:'Jan', revenue:320, expenses:210 },
  { month:'Feb', revenue:350, expenses:225 },
  { month:'Mar', revenue:310, expenses:230 },
  { month:'Apr', revenue:400, expenses:250 },
  { month:'May', revenue:380, expenses:240 },
  { month:'Jun', revenue:420, expenses:260 },
];
const EXPENSE_BREAKDOWN = [
  { label:'Payroll',    pct:52, color:'#3b82f6' },
  { label:'Operations', pct:24, color:'#f5bd02' },
  { label:'Marketing',  pct:14, color:'#22c55e' },
  { label:'Other',      pct:10, color:'#ec4899' },
];

/* ── Task Metrics tab ── */
const TASK_STATUS_COUNTS = [
  { label:'Todo',        pct:45, color:'#9ca3af' },
  { label:'In Progress', pct:25, color:'#3b82f6' },
  { label:'In Review',   pct:15, color:'#f5bd02' },
  { label:'Completed',   pct:15, color:'#22c55e' },
];
const TASK_PRIORITY_COUNTS = [
  { label:'High',   pct:40, color:'#ef4444' },
  { label:'Medium', pct:35, color:'#8b5cf6' },
  { label:'Low',    pct:25, color:'#84cc16' },
];

/* ── Staff Development tab ── */
const TRAINING_COMPLIANCE = [
  { label:'Cyber Security Fundamentals',   pct:100, mandatory:true  },
  { label:'Data Privacy & NDPR Compliance',pct:80,  mandatory:true  },
  { label:'Health & Safety',               pct:100, mandatory:true  },
  { label:'Leadership Excellence',         pct:45,  mandatory:false },
  { label:'React & Next.js',               pct:30,  mandatory:false },
];
const DEPT_COMPLETION = [
  { label:'Engineering', pct:88 },
  { label:'Sales',       pct:76 },
  { label:'Finance',     pct:92 },
  { label:'HR',          pct:81 },
  { label:'Marketing',   pct:69 },
];

/* ── Time Records tab ── */
const DEPT_HOURS = [
  { label:'Engineering', pct:100, sub:'412h' },
  { label:'Sales',       pct:75,  sub:'310h' },
  { label:'Finance',     pct:70,  sub:'288h' },
  { label:'Operations',  pct:64,  sub:'265h' },
  { label:'HR',          pct:46,  sub:'190h' },
];
const PUNCTUALITY = [
  { label:'Michael Chima', pct:100 },
  { label:'Lisa R',        pct:98  },
  { label:'Emily Davis',   pct:96  },
  { label:'Mike Tutor',    pct:95  },
  { label:'Robert Amadi',  pct:93  },
];

/* Area line chart (Jan–Jun) */
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun'];
const ACTIVE    = [35, 42, 38, 50, 44, 55];
const ON_LEAVE  = [14, 20, 18, 22, 16, 28];
const CHART_W   = 500; const CHART_H = 80; const PAD_L = 25; const PAD_R = 15;
function lineY(v: number, max: number) { return CHART_H - (v / max) * (CHART_H - 5); }
function lineX(i: number) { return PAD_L + (i / (MONTHS.length - 1)) * (CHART_W - PAD_L - PAD_R); }
const MAX_V = 65;

export default function AnalyticsPage() {
  const [reportTab,   setReportTab]   = useState<ReportTab>('staff');
  const [dateRange,   setDateRange]   = useState('Last 30 Days');
  const [department,  setDepartment]  = useState('All Departments');
  const [reportType,  setReportType]  = useState('Overview');
  const [showExport,  setShowExport]  = useState(false);
  const [loading,     setLoading]     = useState(true);

  useEffect(() => { setLoading(false); }, []);

  const BAR_MAX = 100;

  if (loading) return <SkeletonAnalytics />;

  return (
    <div className="p-4 md:p-5">

      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Analytics &amp; Reports</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Comprehensive insights into business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
            <RefreshIcon /> Refresh Data
          </button>
          <div className="relative">
            <button onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
              <ExportIcon /> Export <ChevronSmIcon />
            </button>
            {showExport && (
              <div className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl bg-white shadow-lg dark:bg-[#1e1e1e]">
                {['Export CSV','Export PDF','Export Excel'].map(o => (
                  <button key={o} onClick={() => setShowExport(false)}
                    className="w-full px-4 py-2.5 text-left text-[12px] text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/4">{o}</button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live Activity Monitor */}
      <div className="mb-5 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            <span className="text-[13px] font-bold text-gray-800 dark:text-white">Live Activity Monitor</span>
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">Real-time</span>
          </div>
          <button className="text-[11px] font-medium text-[#f5bd02] hover:underline">View All</button>
        </div>
        <p className="mb-3 text-[11px] text-gray-400">Monitor real-time platform activity across all departments</p>
        <div className="flex flex-col gap-2">
          {ACTIVITY_LOG.map((a, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: a.color }}>{a.initials}</div>
              <div className="flex flex-1 items-center gap-2">
                <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{a.name}</span>
                <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: a.color }}>{a.action}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">{a.detail}</span>
              </div>
              <span className="flex-shrink-0 text-[10px] text-gray-400">{a.time}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Report Filters */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <div className="flex flex-1 flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Date Range</label>
          <select value={dateRange} onChange={e => setDateRange(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
            {['Last 7 Days','Last 30 Days','Last 3 Months','Last 6 Months','Last Year','Custom Range'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Department</label>
          <select value={department} onChange={e => setDepartment(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
            {['All Departments','Sales','Marketing','Customer Support','Operations','Finance','IT'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="flex flex-1 flex-col gap-1 min-w-[130px]">
          <label className="text-[10px] font-medium text-gray-500 dark:text-gray-400">Report Type</label>
          <select value={reportType} onChange={e => setReportType(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
            {['Overview','Detailed Analysis','Executive Summary','Comparative Report'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg px-5 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
          <FilterIcon /> Generate Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label:'Total Revenue',    value:'$2.4M', sub:'+8%',   iconBg:'#dcfce7', iconColor:'#16a34a', icon:<DollarIcon />  },
          { label:'All Staff',        value:'47',    sub:'Active', iconBg:'#dbeafe', iconColor:'#2563eb', icon:<UsersIcon />   },
          { label:'Tasks Completed',  value:'234',   sub:'This month', iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<TaskIcon /> },
          { label:'Avg. Performance', value:'91.6%', sub:'↑ 2.3%', iconBg:'#fef9c3', iconColor:'#d97706', icon:<StarIcon />   },
        ].map(s => (
          <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
              <p className="mt-0.5 text-[20px] font-bold text-gray-800 dark:text-white">{s.value}</p>
              <p className="text-[10px] text-green-500">{s.sub}</p>
            </div>
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor:s.iconBg, color:s.iconColor }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* Report tabs */}
      <div className="mb-5 flex overflow-x-auto">
        {([
          { key:'staff',       label:'Staff Performance' },
          { key:'financial',   label:'Financial'         },
          { key:'tasks',       label:'Task Metrics'      },
          { key:'development', label:'Staff Development' },
          { key:'records',     label:'Time Records'      },
        ] as { key: ReportTab; label: string }[]).map(t => (
          <button key={t.key} onClick={() => setReportTab(t.key)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors
              ${reportTab === t.key ? 'bg-[#f5bd02] text-[#1a1a1a]' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {reportTab === 'staff' && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">

          {/* Bar chart: Individual Performance */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Individual Performance</h2>
            <p className="mb-4 text-[11px] text-gray-400">Staff productivity and task completion rates</p>
            <div className="flex items-end justify-around gap-2" style={{ height:120 }}>
              {STAFF_PERF.map(s => (
                <div key={s.name} className="flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5" style={{ height:90 }}>
                    <div className="w-5 rounded-t-sm bg-[#22c55e]" style={{ height:`${(s.productivity/BAR_MAX)*90}px` }} />
                    <div className="w-5 rounded-t-sm bg-[#f5bd02]" style={{ height:`${(s.rating/5)*90}px` }} />
                  </div>
                  <span className="text-[9px] text-gray-400 text-center leading-tight">{s.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#22c55e]" /><span className="text-[10px] text-gray-500">Productivity %</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#f5bd02]" /><span className="text-[10px] text-gray-500">Rating</span></div>
            </div>
          </div>

          {/* Radar chart: Department Performance */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Department Performance</h2>
            <p className="mb-3 text-[11px] text-gray-400">Multi-dimensional department analysis</p>
            <div className="flex items-center justify-center">
              <svg width="240" height="240" viewBox="0 0 240 240">
                {/* Grid rings */}
                {radarGridFracs.map(f => (
                  <polygon key={f} points={pts([f,f,f,f,f,f])} fill="none" stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-white/10" />
                ))}
                {/* Axis lines */}
                {RADAR_AXES.map((_, i) => {
                  const p = radarPt(i, 1);
                  return <line key={i} x1={RADAR_CX} y1={RADAR_CY} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)} stroke="#e5e7eb" strokeWidth="1" className="dark:stroke-white/10" />;
                })}
                {/* Series */}
                {radarSeriesData.map(s => (
                  <polygon key={s.label} points={pts(s.fracs)} fill={s.color} fillOpacity="0.18" stroke={s.color} strokeWidth="1.5" />
                ))}
                {/* Axis labels */}
                {RADAR_AXES.map((label, i) => {
                  const p = radarPt(i, 1.22);
                  return <text key={i} x={p.x.toFixed(1)} y={p.y.toFixed(1)} textAnchor="middle" dominantBaseline="middle" fontSize="9" fill="#9ca3af">{label}</text>;
                })}
              </svg>
            </div>
            <div className="mt-1 flex items-center justify-center gap-4">
              {radarSeriesData.map(s => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] text-gray-500">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Area line chart */}
      {reportTab === 'staff' && (
        <div className="mb-5 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Staff Activity Timeline</h2>
          <p className="mb-4 text-[11px] text-gray-400">Monthly staff attendance and availability trends</p>
          <div className="overflow-x-auto">
            <svg width="100%" viewBox={`0 0 ${CHART_W} ${CHART_H + 30}`} preserveAspectRatio="xMidYMid meet">
              {/* Y grid lines */}
              {[0,15,30,45,60].map(v => (
                <g key={v}>
                  <line x1={PAD_L} y1={lineY(v,MAX_V)} x2={CHART_W - PAD_R} y2={lineY(v,MAX_V)} stroke="#f3f4f6" strokeWidth="1" className="dark:stroke-white/6" />
                  <text x={PAD_L - 4} y={lineY(v,MAX_V)} textAnchor="end" dominantBaseline="middle" fontSize="8" fill="#9ca3af">{v}</text>
                </g>
              ))}
              {/* Active Staff area */}
              <polygon
                points={`${lineX(0)},${CHART_H} ${ACTIVE.map((_,i) => `${lineX(i)},${lineY(ACTIVE[i],MAX_V)}`).join(' ')} ${lineX(MONTHS.length-1)},${CHART_H}`}
                fill="#22c55e" fillOpacity="0.15" />
              <polyline points={ACTIVE.map((_,i) => `${lineX(i)},${lineY(ACTIVE[i],MAX_V)}`).join(' ')} fill="none" stroke="#22c55e" strokeWidth="2" />
              {/* On Leave area */}
              <polygon
                points={`${lineX(0)},${CHART_H} ${ON_LEAVE.map((_,i) => `${lineX(i)},${lineY(ON_LEAVE[i],MAX_V)}`).join(' ')} ${lineX(MONTHS.length-1)},${CHART_H}`}
                fill="#f97316" fillOpacity="0.12" />
              <polyline points={ON_LEAVE.map((_,i) => `${lineX(i)},${lineY(ON_LEAVE[i],MAX_V)}`).join(' ')} fill="none" stroke="#f97316" strokeWidth="2" strokeDasharray="4 2" />
              {/* Month labels */}
              {MONTHS.map((m,i) => (
                <text key={m} x={lineX(i)} y={CHART_H + 14} textAnchor="middle" fontSize="9" fill="#9ca3af">{m}</text>
              ))}
            </svg>
          </div>
          <div className="mt-2 flex items-center gap-5">
            <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded-full bg-[#22c55e]" /><span className="text-[10px] text-gray-500">Active Staff</span></div>
            <div className="flex items-center gap-1.5"><div className="h-2 w-6 rounded-full bg-[#f97316]" style={{ opacity:0.7 }} /><span className="text-[10px] text-gray-500">On Leave</span></div>
          </div>
        </div>
      )}

      {/* Financial tab */}
      {reportTab === 'financial' && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Revenue vs Expenses</h2>
            <p className="mb-4 text-[11px] text-gray-400">Monthly comparison ($ thousands)</p>
            <div className="flex items-end justify-around gap-2" style={{ height:120 }}>
              {MONTHLY_FINANCE.map(m => (
                <div key={m.month} className="flex flex-col items-center gap-1">
                  <div className="flex items-end gap-0.5" style={{ height:90 }}>
                    <div className="w-5 rounded-t-sm bg-[#22c55e]" style={{ height:`${(m.revenue/450)*90}px` }} />
                    <div className="w-5 rounded-t-sm bg-[#f97316]" style={{ height:`${(m.expenses/450)*90}px` }} />
                  </div>
                  <span className="text-[9px] text-gray-400">{m.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#22c55e]" /><span className="text-[10px] text-gray-500">Revenue</span></div>
              <div className="flex items-center gap-1.5"><div className="h-2.5 w-2.5 rounded-sm bg-[#f97316]" /><span className="text-[10px] text-gray-500">Expenses</span></div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-4 text-[13px] font-bold text-gray-800 dark:text-white">Expense Breakdown</h2>
            <BarList rows={EXPENSE_BREAKDOWN} />
          </div>
        </div>
      )}

      {/* Task Metrics tab */}
      {reportTab === 'tasks' && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-4 text-[13px] font-bold text-gray-800 dark:text-white">Tasks by Status</h2>
            <BarList rows={TASK_STATUS_COUNTS} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="mb-4 text-[13px] font-bold text-gray-800 dark:text-white">Tasks by Priority</h2>
            <BarList rows={TASK_PRIORITY_COUNTS} />
          </div>
        </div>
      )}

      {/* Staff Development tab */}
      {reportTab === 'development' && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Training Compliance</h2>
            <p className="mb-4 text-[11px] text-gray-400">Completion rate by program</p>
            <BarList rows={TRAINING_COMPLIANCE.map(t => ({ label: t.mandatory ? `${t.label} (Mandatory)` : t.label, pct: t.pct, color: t.pct >= 90 ? '#22c55e' : t.pct >= 60 ? '#f5bd02' : '#ef4444' }))} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Completion by Department</h2>
            <p className="mb-4 text-[11px] text-gray-400">Overall training completion rate</p>
            <BarList rows={DEPT_COMPLETION.map(d => ({ ...d, color: d.pct >= 85 ? '#22c55e' : d.pct >= 70 ? '#f5bd02' : '#f97316' }))} />
          </div>
        </div>
      )}

      {/* Time Records tab */}
      {reportTab === 'records' && (
        <div className="mb-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Hours Logged by Department</h2>
            <p className="mb-4 text-[11px] text-gray-400">This month</p>
            <BarList rows={DEPT_HOURS.map(d => ({ label: d.label, pct: d.pct, color: '#3b82f6', sub: d.sub }))} />
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Punctuality</h2>
            <p className="mb-4 text-[11px] text-gray-400">On-time clock-in rate</p>
            <BarList rows={PUNCTUALITY.map(p => ({ ...p, color: p.pct >= 97 ? '#22c55e' : p.pct >= 90 ? '#f5bd02' : '#f97316' }))} />
          </div>
        </div>
      )}

      {/* Detailed Performance Metrics */}
      {reportTab === 'staff' && (
        <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-[13px] font-bold text-gray-800 dark:text-white">Detailed Performance Metrics</h2>
              <p className="text-[11px] text-gray-400">Comprehensive staff performance breakdown</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300">
              <ExportIcon /> Export
            </button>
          </div>
          <div className="flex flex-col gap-4">
            {PERF_METRICS.map(m => {
              const pct = m.productivity;
              const barColor = pct >= 90 ? '#22c55e' : pct >= 80 ? '#f5bd02' : '#f97316';
              return (
                <div key={m.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{m.name}</p>
                      <p className="text-[10px] text-gray-400">
                        Tasks {m.tasks} &nbsp;·&nbsp; Attendance: {m.attendance}% &nbsp;·&nbsp; ☆ {m.rating}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold" style={{ color: barColor }}>{pct}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
                    <div className="h-2 rounded-full transition-all" style={{ width:`${pct}%`, backgroundColor: barColor }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* Reusable label + percentage bar row, used across the non-staff report tabs */
function BarList({ rows }: { rows: { label: string; pct: number; color: string; sub?: string }[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map(r => (
        <div key={r.label}>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[12px] font-medium text-gray-700 dark:text-gray-200">{r.label}</span>
            <span className="text-[12px] font-bold" style={{ color: r.color }}>{r.sub ?? `${r.pct}%`}</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
            <div className="h-2 rounded-full transition-all" style={{ width:`${r.pct}%`, backgroundColor: r.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RefreshIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23,4 23,10 17,10"/><path d="M20.5 15a9 9 0 1 1-.5-7.9"/></svg>; }
function ExportIcon()   { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="4,6 8,2 12,6"/><line x1="8" y1="2" x2="8" y2="11"/><rect x="2" y="12" width="12" height="2" rx="1"/></svg>; }
function ChevronSmIcon(){ return <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>; }
function FilterIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/></svg>; }
function DollarIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function UsersIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function TaskIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function StarIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>; }
