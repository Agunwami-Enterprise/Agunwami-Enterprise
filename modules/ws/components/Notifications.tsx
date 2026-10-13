'use client';

/**
 * Department workstation → Notifications (/ws/notifications): your AE Hub
 * notifications (tasks, leave, documents, payments…) with read / unread and
 * mark-all-read, and AE Hub's company announcements.
 */

import { useEffect, useState } from 'react';
import { collection, doc, limit, onSnapshot, orderBy, query, where, writeBatch } from 'firebase/firestore';
import { Bell, CheckCheck, Megaphone } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { authDb } from '@/lib/workstation/firebase';
import { Card, Empty, ErrorNote, PageHeader, Pill, Tabs, btnGhost } from './ui';

interface Notice { id: string; title: string; message: string; type: string; read: boolean; at: Date | null }
interface Announcement { id: string; title: string; content: string; priority: string; author: string; at: Date | null }

const dateOf = (v: unknown): Date | null => {
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate();
  if (typeof v === 'number') return new Date(v);
  if (typeof v === 'string') { const d = new Date(v); return Number.isNaN(d.getTime()) ? null : d; }
  return null;
};

const toNotice = (id: string, d: Record<string, unknown>): Notice => ({
  id, title: String(d.title ?? 'Notification'), message: String(d.message ?? d.body ?? d.content ?? ''),
  type: String(d.type ?? d.category ?? 'update'), read: d.read === true || d.isRead === true, at: dateOf(d.createdAt ?? d.timestamp),
});
const toAnnouncement = (id: string, d: Record<string, unknown>): Announcement => ({
  id, title: String(d.title ?? 'Announcement'), content: String(d.content ?? d.message ?? d.body ?? ''),
  priority: String(d.priority ?? 'normal'), author: String(d.author ?? d.createdByName ?? d.postedByName ?? ''), at: dateOf(d.createdAt ?? d.postedAt),
});

const ago = (d: Date | null, now: number) => {
  if (!d || !now) return '';
  const mins = Math.round((now - d.getTime()) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TYPE_TONE: Record<string, 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'gray'> = {
  task: 'blue', task_held: 'amber', leave: 'green', payment: 'purple', document: 'gray', announcement: 'amber', warning: 'red',
};

type Tab = 'notifications' | 'announcements';

export default function Notifications() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [byField, setByField] = useState<{ userId: Notice[]; recipientId: Notice[] } | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('notifications');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const every = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  // AE Hub writes `userId` on some notifications and `recipientId` on others.
  useEffect(() => {
    if (!uid) return;
    const listen = (fieldName: 'userId' | 'recipientId') => onSnapshot(
      query(collection(authDb, 'notifications'), where(fieldName, '==', uid)),
      snap => setByField(prev => ({ userId: prev?.userId ?? [], recipientId: prev?.recipientId ?? [], [fieldName]: snap.docs.map(d => toNotice(d.id, d.data())) })),
      () => setByField(prev => ({ userId: prev?.userId ?? [], recipientId: prev?.recipientId ?? [] })),
    );
    const a = listen('userId'), b = listen('recipientId');
    return () => { a(); b(); };
  }, [uid]);

  useEffect(() => onSnapshot(query(collection(authDb, 'announcements'), orderBy('createdAt', 'desc'), limit(50)),
    snap => setAnnouncements(snap.docs.map(d => toAnnouncement(d.id, d.data()))),
    () => { setAnnouncements([]); setError('Announcements could not be loaded.'); }), []);

  const merged = new Map<string, Notice>();
  for (const n of [...(byField?.userId ?? []), ...(byField?.recipientId ?? [])]) merged.set(n.id, n);
  const notices = [...merged.values()].sort((a, b) => (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0));
  const unread = notices.filter(n => !n.read);
  const shown = unreadOnly ? unread : notices;

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    try {
      for (let i = 0; i < ids.length; i += 400) {
        const batch = writeBatch(authDb);
        ids.slice(i, i + 400).forEach(id => batch.update(doc(authDb, 'notifications', id), { read: true, isRead: true }));
        await batch.commit();
      }
    } catch {
      setError('Notifications could not be marked as read.');
    }
  }

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Notifications" subtitle="Updates about your tasks, leave and payments, and company announcements"
        actions={tab === 'notifications' && unread.length > 0 ? <button className={btnGhost} onClick={() => void markRead(unread.map(n => n.id))}><CheckCheck className="h-4 w-4" aria-hidden /> Mark all read</button> : undefined} />

      {error && <ErrorNote>{error}</ErrorNote>}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'notifications', label: 'Notifications', badge: unread.length }, { id: 'announcements', label: 'Announcements' }]} />

      {tab === 'notifications' ? (
        <Card title="Notifications" icon={Bell} action={
          <div role="radiogroup" aria-label="Show" className="flex rounded-lg bg-[#f0f0f0] p-0.5 dark:bg-white/8">
            {[false, true].map(only => (
              <button key={String(only)} role="radio" aria-checked={unreadOnly === only} onClick={() => setUnreadOnly(only)}
                className={`rounded-md px-3 py-1 text-[13px] font-medium ${unreadOnly === only ? 'bg-white text-[#292929] shadow-sm dark:bg-[#2a2a2a] dark:text-white' : 'text-[#8a8a8a]'}`}>
                {only ? `Unread (${unread.length})` : 'All'}
              </button>
            ))}
          </div>
        }>
          {byField === null ? <Empty>Loading…</Empty> : shown.length === 0 ? <Empty>{unreadOnly ? 'You’re all caught up.' : 'No notifications yet.'}</Empty> : (
            <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
              {shown.map(n => (
                <li key={n.id}>
                  <button onClick={() => { if (!n.read) void markRead([n.id]); }} className="flex w-full items-start gap-3 py-3 text-left">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-[#f5bd02]'}`} aria-label={n.read ? undefined : 'Unread'} />
                    <div className="min-w-0 flex-1">
                      <p className={`text-[14px] ${n.read ? 'text-[#525252] dark:text-gray-300' : 'font-semibold text-[#292929] dark:text-white'}`}>{n.title}</p>
                      {n.message && <p className="mt-0.5 text-[13px] text-[#656565] dark:text-gray-400">{n.message}</p>}
                      <p className="mt-1 text-[12px] text-[#a3a3a3]">{ago(n.at, now)}</p>
                    </div>
                    <Pill label={n.type.replace(/_/g, ' ')} tone={TYPE_TONE[n.type] ?? 'gray'} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ) : (
        <Card title="Company Announcements" icon={Megaphone}>
          {announcements === null ? <Empty>Loading…</Empty> : announcements.length === 0 ? <Empty>No announcements yet.</Empty> : (
            <ul className="space-y-3">
              {announcements.map(a => (
                <li key={a.id} className={`rounded-lg border p-4 ${/high|urgent/i.test(a.priority) ? 'border-[#fecaca] bg-[#fef2f2] dark:border-red-500/30 dark:bg-red-500/10' : 'border-[#e5e5e5] dark:border-white/10'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[15px] font-semibold text-[#292929] dark:text-white">{a.title}</p>
                    {/high|urgent/i.test(a.priority) && <Pill label="Important" tone="red" />}
                  </div>
                  {a.content && <p className="mt-1 whitespace-pre-wrap text-[14px] leading-6 text-[#525252] dark:text-gray-300">{a.content}</p>}
                  <p className="mt-2 text-[12px] text-[#a3a3a3]">{[a.author, ago(a.at, now)].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
