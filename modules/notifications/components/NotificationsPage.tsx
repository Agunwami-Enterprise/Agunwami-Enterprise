'use client';

import { useEffect, useState } from 'react';
import { subscribeNotifications } from '@/modules/notifications/services';
import { useAuth } from '@/lib/workstation/auth-context';
import { SkeletonNotifications } from '@/app/components/ceo/Skeleton';

type NotifTab    = 'notifications' | 'announcements';
type NotifFilter = 'all' | 'tasks' | 'updates' | 'payments' | 'messages';
type Priority    = 'High' | 'Medium' | 'Low';
type AnnType     = 'Information' | 'Warning' | 'Success';

interface Notif {
  id: string; title: string; body: string; time: string;
  tag: string; tagColor: string; read: boolean;
  iconBg: string; iconColor: string; category: Exclude<NotifFilter,'all'>;
}


const FILTER_LABELS: { key: NotifFilter; label: string; count: number }[] = [
  { key:'all',      label:'All',      count:10 },
  { key:'tasks',    label:'Tasks',    count:2  },
  { key:'updates',  label:'Updates',  count:2  },
  { key:'payments', label:'Payments', count:2  },
  { key:'messages', label:'Messages', count:1  },
];

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [tab,    setTab]    = useState<NotifTab>('notifications');
  const [filter, setFilter] = useState<NotifFilter>('all');
  const [search, setSearch] = useState('');
  const [notifs,   setNotifs]   = useState<Notif[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      if (!authLoading) setLoading(false);
      return;
    }
    return subscribeNotifications(user.uid, (data) => { setNotifs(data as Notif[]); setLoading(false); });
  }, [user?.uid, authLoading]);

  /* Create Announcement modal */
  const [showAnn,    setShowAnn]    = useState(false);
  const [annTitle,   setAnnTitle]   = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState<Priority>('High');
  const [annType,    setAnnType]    = useState<AnnType>('Information');

  const filtered = notifs.filter(n => {
    if (filter !== 'all' && n.category !== filter) return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase()) && !n.body.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const unread = notifs.filter(n => !n.read).length;

  function markAllRead() { setNotifs(prev => prev.map(n => ({ ...n, read: true }))); }
  function clearAll()    { setNotifs([]); }
  function dismiss(id: string) { setNotifs(prev => prev.filter(n => n.id !== id)); }

  if (loading) return <SkeletonNotifications />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Notifications &amp; Communication</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage your notifications and communication preferences</p>
          </div>
          <div className="flex gap-2">
            <button onClick={markAllRead} className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
              <CheckIcon /> Mark All Read
            </button>
            <button onClick={clearAll} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-[11px] font-medium text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/8">
              <XSmIcon /> Clear All
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label:'Total Notifications', value:notifs.length, sub:`${unread} unread`,    iconBg:'#dbeafe', iconColor:'#2563eb', icon:<BellIcon /> },
            { label:'Tasks',               value:2,             sub:'Task notifications',  iconBg:'#dcfce7', iconColor:'#16a34a', icon:<TaskIcon /> },
            { label:'Announcements',        value:2,             sub:'CEO/Admin updates',  iconBg:'#fef9c3', iconColor:'#d97706', icon:<MegaIcon /> },
            { label:'Payments',             value:2,             sub:'Payment updates',    iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<PayIcon />  },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">{s.value}</p>
                <p className="text-[10px] text-gray-400">{s.sub}</p>
              </div>
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>{s.icon}</div>
            </div>
          ))}
        </div>

        {/* Main tabs */}
        <div className="mb-4 flex gap-1 rounded-xl bg-gray-100 p-1 dark:bg-[#1a1a1a]">
          {(['notifications','announcements'] as NotifTab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors
                ${tab === t ? 'bg-[#f5bd02] text-[#1a1a1a] shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
              {t === 'notifications' ? <BellIcon /> : <MegaIcon />}
              {t === 'notifications' ? 'Notifications' : 'Announcements'}
            </button>
          ))}
        </div>

        {/* NOTIFICATIONS TAB */}
        {tab === 'notifications' && (
          <div className="rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-white/6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/8 dark:bg-[#2a2a2a]">
                <SearchSmIcon />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search notifications..."
                  className="min-w-0 w-48 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500" />
              </div>
              <select className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-600 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-300">
                <option>Newest First</option><option>Oldest First</option><option>Unread First</option>
              </select>
            </div>

            {/* Sub-filters */}
            <div className="flex gap-2 overflow-x-auto border-b border-gray-100 px-4 py-2.5 dark:border-white/6">
              {FILTER_LABELS.map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className={`flex flex-shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors
                    ${filter === f.key ? 'bg-[#f5bd02] text-[#1a1a1a]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/6 dark:text-gray-300 dark:hover:bg-white/10'}`}>
                  {f.label === 'All' ? f.label : f.label} ({f.count})
                </button>
              ))}
            </div>

            {/* Notification list */}
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-bold text-gray-800 dark:text-white">Recent Notifications</p>
                <p className="text-[11px] text-gray-400">{notifs.length} notifications</p>
              </div>
              <div className="flex flex-col gap-2">
                {filtered.length === 0 && (
                  <p className="py-8 text-center text-[13px] text-gray-400">No notifications</p>
                )}
                {filtered.map(n => (
                  <div key={n.id}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${!n.read ? 'bg-amber-50 dark:bg-amber-900/10' : 'hover:bg-gray-50 dark:hover:bg-white/3'}`}>
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: n.iconBg, color: n.iconColor }}>
                      <BellIcon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{n.title}</p>
                        {n.tag && (
                          <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold text-white" style={{ backgroundColor: n.tagColor }}>{n.tag}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{n.body}</p>
                      <p className="mt-0.5 text-[10px] text-gray-400">{n.time}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button className="text-gray-300 hover:text-gray-500 dark:hover:text-gray-300"><EyeIcon /></button>
                      <button onClick={() => dismiss(n.id)} className="text-gray-300 hover:text-red-400"><TrashIcon /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {tab === 'announcements' && (
          <div className="rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/6">
              <p className="text-[13px] font-bold text-gray-800 dark:text-white">Company Announcements</p>
              <button onClick={() => setShowAnn(true)}
                className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90" style={{ backgroundColor: '#f5bd02' }}>
                <PlusIcon /> Create Announcement
              </button>
            </div>
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MegaIcon />
              <p className="mt-3 text-[13px] font-semibold text-gray-600 dark:text-gray-300">No announcements yet</p>
              <p className="text-[11px] text-gray-400">Create an announcement to notify your team</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Announcement modal */}
      {showAnn && (
        <Overlay onClose={() => setShowAnn(false)}>
          <div className="w-[440px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Create New Announcement</h2>
              <button onClick={() => setShowAnn(false)} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="flex flex-col gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Title</label>
                <input value={annTitle} onChange={e => setAnnTitle(e.target.value)} placeholder="Enter announcement title..."
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Content</label>
                <textarea value={annContent} onChange={e => setAnnContent(e.target.value)} placeholder="Enter announcement content..." rows={4}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Priority</label>
                  <select value={annPriority} onChange={e => setAnnPriority(e.target.value as Priority)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['High','Medium','Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">Type</label>
                  <select value={annType} onChange={e => setAnnType(e.target.value as AnnType)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                    {['Information','Warning','Success'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowAnn(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 dark:border-white/8 dark:text-gray-400">Cancel</button>
              <button onClick={() => setShowAnn(false)}
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90" style={{ backgroundColor: '#f5bd02' }}>
                Create Announcement
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PlusIcon()    { return <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>; }
function XIcon()       { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>; }
function XSmIcon()     { return <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>; }
function CheckIcon()   { return <svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="2,7 6,11 12,3"/></svg>; }
function BellIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>; }
function TaskIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9,11 12,14 22,4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function MegaIcon()    { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 8s-2 2-6 2H6a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h.5l1 4h3l1-4H16c4 0 6 2 6 2V8z"/></svg>; }
function PayIcon()     { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>; }
function SearchSmIcon(){ return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>; }
function EyeIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function TrashIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>; }
