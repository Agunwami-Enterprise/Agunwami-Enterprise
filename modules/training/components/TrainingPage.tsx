'use client';

import { useEffect, useState } from 'react';
import { subscribeTraining } from '@/modules/training/services';
import { SkeletonTraining } from '@/app/components/ceo/Skeleton';

type TrainingStatus = 'not-started' | 'in-progress' | 'completed';

interface Training {
  id: string; title: string; category: string; hours: number;
  status: TrainingStatus; progress: number;
  dueDate: string; overdue: boolean; mandatory: boolean;
  assignedTo: string[]; color: string;
}

const CATEGORIES = ['All Categories','Leadership','Safety','Customer Service','Compliance','Communication','Professional Development','HR & Culture'];


export default function TrainingPage() {
  const [search,     setSearch]     = useState('');
  const [catFilter,  setCatFilter]  = useState('All Categories');
  const [showCreate, setShowCreate] = useState(false);
  const [MOCK,       setMOCK]       = useState<Training[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => subscribeTraining((data) => { setMOCK(data as Training[]); setLoading(false); }), []);

  /* create modal state */
  const [cTitle,   setCTitle]   = useState('');
  const [cCat,     setCCat]     = useState('Select Categories');
  const [cDesc,    setCDesc]    = useState('');
  const [cDur,     setCDur]     = useState('');
  const [cDate,    setCDate]    = useState('');
  const [cAssign,  setCAssign]  = useState<string[]>([]);
  const [cMandatory, setCMandatory] = useState(false);

  const ASSIGN_OPTIONS = ['All Staff','Engineering','Management Team'];

  const filtered = MOCK.filter(t => {
    if (catFilter !== 'All Categories' && t.category !== catFilter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    available:  MOCK.length,
    completed:  MOCK.filter(t => t.status === 'completed').length,
    mandatory:  MOCK.filter(t => t.mandatory).length,
    inProgress: MOCK.filter(t => t.status === 'in-progress').length,
    hours:      MOCK.reduce((s, t) => s + t.hours, 0),
  };

  function toggleAssign(v: string) {
    setCAssign(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  if (loading) return <SkeletonTraining />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Training</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Enhance your professional skills with workplace training programs</p>
          </div>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
            <PlusIcon /> Create New Training
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label:'Available Trainings', value:stats.available,  iconBg:'#dbeafe', iconColor:'#2563eb', icon:<BookIcon />    },
            { label:'Completed',           value:stats.completed,  iconBg:'#dcfce7', iconColor:'#16a34a', icon:<CheckCIcon />  },
            { label:'Mandatory',           value:stats.mandatory,  iconBg:'#fee2e2', iconColor:'#dc2626', icon:<AlertIcon />   },
            { label:'In Progress',         value:stats.inProgress, iconBg:'#fef3c7', iconColor:'#d97706', icon:<ChartBarIcon />},
            { label:'Training Hours',      value:`${stats.hours}h`,iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<AwardIcon />   },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">{s.value}</p>
              </div>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>{s.icon}</div>
            </div>
          ))}
        </div>

        {/* Search + filter */}
        <div className="mb-5 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]">
            <SearchIcon />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search training programs..."
              className="flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500" />
          </div>
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200">
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Training grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(t => <TrainingCard key={t.id} training={t} />)}
        </div>
      </div>

      {/* Create Training modal */}
      {showCreate && (
        <Overlay onClose={() => setShowCreate(false)}>
          <div className="max-h-[90vh] w-[520px] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Create New Training Program</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Training Title</label>
                  <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Enter training title..."
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Category</label>
                  <select value={cCat} onChange={e => setCCat(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Description</label>
                <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Enter training description..." rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Duration</label>
                  <input value={cDur} onChange={e => setCDur(e.target.value)} placeholder="e.g. 4 hours"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Due Date</label>
                  <input type="date" value={cDate} onChange={e => setCDate(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200" />
                </div>
              </div>
              <div>
                <label className="mb-2 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Assign to</label>
                <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-3 dark:border-white/8">
                  {ASSIGN_OPTIONS.map(o => (
                    <label key={o} className="flex cursor-pointer items-center gap-2">
                      <input type="checkbox" checked={cAssign.includes(o)} onChange={() => toggleAssign(o)}
                        className="h-3.5 w-3.5 rounded accent-[#f5bd02]" />
                      <span className="text-[12px] text-gray-700 dark:text-gray-200">{o}</span>
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={cMandatory} onChange={() => setCMandatory(v => !v)}
                  className="h-3.5 w-3.5 rounded accent-[#f5bd02]" />
                <span className="text-[12px] text-gray-700 dark:text-gray-200">Mark as mandatory</span>
              </label>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 dark:border-white/8 dark:text-gray-400">Cancel</button>
              <button onClick={() => setShowCreate(false)}
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
                Create Training
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ── Training Card ── */
function TrainingCard({ training: t }: { training: Training }) {
  const isCompleted  = t.status === 'completed';
  const isInProgress = t.status === 'in-progress';

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
      {/* Photo header */}
      <div
        className="relative flex h-36 items-end bg-cover bg-center"
        style={{ backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.35), rgba(0,0,0,0)), url(https://picsum.photos/seed/${encodeURIComponent(t.id)}/400/300)` }}
      >
        {t.overdue   && <span className="absolute right-2 top-2 rounded-sm bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white">OVERDUE</span>}
        {t.mandatory && <span className="absolute left-2 top-2 rounded-sm bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">MANDATORY</span>}
      </div>

      <div className="p-4">
        {/* Category + hours */}
        <div className="mb-1 flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: t.color }}>{t.category}</span>
          <span className="flex items-center gap-1 text-[10px] text-gray-400"><ClockSmIcon />{t.hours} hours</span>
        </div>

        <p className="text-[13px] font-bold text-gray-800 dark:text-white">{t.title}</p>

        {/* Due Date */}
        <div className="mt-2 flex items-center gap-1">
          <span className="text-[10px] text-gray-400">Due Date</span>
          <span className={`text-[10px] font-semibold ${t.overdue ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>{t.dueDate}</span>
        </div>

        {/* Assigned to */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-gray-400">Assigned to:</span>
          {t.assignedTo.map(a => (
            <span key={a} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/8 dark:text-gray-300">{a}</span>
          ))}
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[10px] text-gray-400">Progress</span>
            <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-300">{t.progress}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
            <div className="h-1.5 rounded-full transition-all" style={{ width:`${t.progress}%`, backgroundColor: t.progress === 100 ? '#22c55e' : '#3b82f6' }} />
          </div>
        </div>

        {/* Action button + icons */}
        <div className="mt-3 flex items-center justify-between">
          {isCompleted ? (
            <button className="flex items-center gap-1.5 rounded-lg bg-green-100 px-4 py-2 text-[11px] font-semibold text-green-700 dark:bg-green-900/20 dark:text-green-400">
              <CheckSmIcon /> Completed
            </button>
          ) : isInProgress ? (
            <button className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[11px] font-semibold text-white" style={{ backgroundColor:'#3b82f6' }}>
              <PlayIcon /> Continue Training
            </button>
          ) : (
            <button className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-4 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-200 dark:bg-white/8 dark:text-gray-200">
              <PlayIcon /> Start Training
            </button>
          )}
          <div className="flex items-center gap-2">
            <button className="text-gray-400 hover:text-gray-600"><EditSmIcon /></button>
            <button className="text-gray-400 hover:text-red-400"><TrashSmIcon /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PlusIcon()     { return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>; }
function XIcon()        { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>; }
function SearchIcon()   { return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>; }
function BookIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>; }
function CheckCIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="9,12 11,14 15,10"/></svg>; }
function AlertIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><circle cx="12" cy="16" r="0.5" fill="currentColor"/></svg>; }
function ChartBarIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function AwardIcon()    { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"/></svg>; }
function ClockSmIcon()  { return <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>; }
function PlayIcon()     { return <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>; }
function CheckSmIcon()  { return <svg width="10" height="10" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,7 6,11 12,3"/></svg>; }
function EditSmIcon()   { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>; }
function TrashSmIcon()  { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><polyline points="2,4 4,4 14,4"/><path d="M13 4l-.8 9H3.8L3 4"/><path d="M6 7v4M10 7v4"/><path d="M5.5 4V3h5v1"/></svg>; }
