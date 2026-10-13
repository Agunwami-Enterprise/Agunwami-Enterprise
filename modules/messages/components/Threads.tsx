'use client';

/**
 * Thread UI for group chats and communities: the threads list, the dialogs to
 * start a thread, add people and link tasks, the bar shown at the top of an open
 * thread, and the note a thread leaves in its parent chat.
 */

import { AeOverlay } from '@/app/components/common/AeModal';
import { useEffect, useMemo, useState } from 'react';
import { collection, doc, getDocs, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  Check, CheckCircle2, ChevronLeft, ClipboardList, Link2, Loader2, LogOut, MessagesSquare,
  Plus, RotateCcw, Search, Trash2, UserPlus, Users, X,
} from 'lucide-react';
import { authDb } from '@/lib/workstation/firebase';
import {
  MAX_THREAD_TITLE,
  type LinkedTask, type ThreadConversation, type ThreadRef, type ThreadSummary,
} from '../threads';

export interface PersonLite {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

const personName = (people: Record<string, PersonLite>, uid: string) =>
  people[uid]?.displayName || people[uid]?.email || 'Team member';

const timeAgo = (ms?: number | null) => {
  if (!ms) return '';
  const minutes = Math.floor((Date.now() - ms) / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days < 30 ? `${days}d ago` : new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const inputClass = 'w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/40 text-gray-900 dark:text-white';

// ── Tasks ────────────────────────────────────────────────────────────────────

interface TaskOption extends LinkedTask {
  status: string;
  assignee: string;
}

function taskFromDoc(id: string, data: Record<string, unknown>): TaskOption {
  const assignees = Array.isArray(data.assignees) ? data.assignees as Array<{ name?: string }> : [];
  return {
    id,
    title: String(data.title || data.task || 'Untitled task'),
    status: String(data.status || 'Pending'),
    assignee: String(data.assignee || assignees[0]?.name || ''),
  };
}

function statusTone(status: string): string {
  const s = status.toLowerCase();
  if (/(done|complete|approved|closed)/.test(s)) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400';
  if (/(progress|review|doing|active)/.test(s)) return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400';
  if (/(block|overdue|reject|fail)/.test(s)) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
  return 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300';
}

/** Recent staff tasks (AE Hub's staffTasks), newest first. */
function useRecentTasks(enabled: boolean): { tasks: TaskOption[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ tasks: TaskOption[]; loading: boolean; error: string }>({ tasks: [], loading: true, error: '' });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    getDocs(query(collection(authDb, 'staffTasks'), orderBy('createdAt', 'desc'), limit(200)))
      .then(snap => {
        if (!cancelled) setState({ tasks: snap.docs.map(d => taskFromDoc(d.id, d.data())), loading: false, error: '' });
      })
      .catch(err => {
        console.warn('[threads] Could not load tasks:', err);
        if (!cancelled) setState({ tasks: [], loading: false, error: 'Tasks could not be loaded.' });
      });
    return () => { cancelled = true; };
  }, [enabled]);
  return state;
}

/** Live title and status of the tasks linked to a thread. */
export function useLinkedTasks(taskIds: string[]): Record<string, TaskOption | null> {
  const key = [...taskIds].sort().join(',');
  const [tasks, setTasks] = useState<Record<string, TaskOption | null>>({});
  useEffect(() => {
    const ids = key ? key.split(',') : [];
    const unsubscribers = ids.map(id => onSnapshot(
      doc(authDb, 'staffTasks', id),
      snap => setTasks(prev => ({ ...prev, [id]: snap.exists() ? taskFromDoc(id, snap.data()) : null })),
      () => setTasks(prev => ({ ...prev, [id]: null })),
    ));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [key]);
  return tasks;
}

function TaskPicker({ selected, onToggle, busyId }: {
  selected: Record<string, boolean>;
  onToggle: (task: LinkedTask, on: boolean) => void;
  busyId?: string | null;
}) {
  const { tasks, loading, error } = useRecentTasks(true);
  const [search, setSearch] = useState('');
  const shown = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tasks.filter(t => !term || t.title.toLowerCase().includes(term) || t.assignee.toLowerCase().includes(term)).slice(0, 60);
  }, [tasks, search]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks by title or assignee..."
          aria-label="Search tasks" className={`${inputClass} pl-9`} />
      </div>
      <div className="max-h-56 overflow-y-auto rounded-xl border border-gray-100 dark:border-zinc-800">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-xs text-gray-400"><Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading tasks…</div>
        ) : error ? (
          <p className="py-6 text-center text-xs text-rose-500">{error}</p>
        ) : shown.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400">{search ? 'No tasks match.' : 'No tasks yet.'}</p>
        ) : shown.map(task => {
          const on = !!selected[task.id];
          return (
            <button key={task.id} type="button" onClick={() => onToggle(task, !on)} disabled={busyId === task.id}
              aria-pressed={on}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-b last:border-0 border-gray-50 dark:border-zinc-800/60 transition-colors ${on ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}>
              <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${on ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                {busyId === task.id ? <Loader2 className="w-2.5 h-2.5 animate-spin text-white" /> : on && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{task.title}</span>
                {task.assignee && <span className="block text-[11px] text-gray-400 truncate">{task.assignee}</span>}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${statusTone(task.status)}`}>{task.status}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── People ───────────────────────────────────────────────────────────────────

function MemberChecklist({ candidates, people, selected, onChange }: {
  candidates: string[];
  people: Record<string, PersonLite>;
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const [search, setSearch] = useState('');
  const term = search.trim().toLowerCase();
  const shown = candidates
    .filter(uid => !term || personName(people, uid).toLowerCase().includes(term))
    .sort((a, b) => personName(people, a).localeCompare(personName(people, b)));
  const allSelected = candidates.length > 0 && candidates.every(uid => selected.has(uid));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people..." aria-label="Search people" className={`${inputClass} pl-9`} />
        </div>
        {candidates.length > 1 && (
          <button type="button" onClick={() => onChange(allSelected ? new Set() : new Set(candidates))}
            className="shrink-0 px-3 py-2.5 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-xl">
            {allSelected ? 'Clear' : 'Select all'}
          </button>
        )}
      </div>
      <div className="max-h-48 overflow-y-auto rounded-xl border border-gray-100 dark:border-zinc-800">
        {shown.length === 0 ? (
          <p className="py-5 text-center text-xs text-gray-400">{candidates.length === 0 ? 'Everyone here is already in the thread.' : 'No one matches.'}</p>
        ) : shown.map(uid => {
          const on = selected.has(uid);
          const name = personName(people, uid);
          return (
            <button key={uid} type="button" aria-pressed={on}
              onClick={() => { const next = new Set(selected); if (on) next.delete(uid); else next.add(uid); onChange(next); }}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b last:border-0 border-gray-50 dark:border-zinc-800/60 ${on ? 'bg-amber-50 dark:bg-amber-950/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'}`}>
              {people[uid]?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={people[uid]!.photoURL!} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-7 h-7 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{name[0]?.toUpperCase()}</span>
              )}
              <span className="flex-1 text-sm text-gray-800 dark:text-gray-100 truncate">{name}</span>
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'bg-amber-500 border-amber-500' : 'border-gray-300 dark:border-zinc-600'}`}>
                {on && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Dialog shell ─────────────────────────────────────────────────────────────

function Dialog({ title, icon, onClose, children, footer, labelId }: {
  title: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  labelId: string;
}) {
  return (
    <AeOverlay onClose={onClose} labelledBy={labelId} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="ae-pop-in flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-amber-500">{icon}</span>
            <h2 id={labelId} className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
        {footer && <div className="border-t border-gray-100 px-5 py-4 dark:border-zinc-800">{footer}</div>}
      </div>
    </AeOverlay>
  );
}

// ── Start a thread ───────────────────────────────────────────────────────────

export function CreateThreadModal({ parent, people, myUid, source, onClose, onCreate }: {
  parent: ThreadConversation;
  people: Record<string, PersonLite>;
  myUid: string;
  source?: { id: string; senderId: string; senderName: string; text: string } | null;
  onClose: () => void;
  onCreate: (input: { title: string; memberIds: string[]; tasks: LinkedTask[] }) => Promise<void>;
}) {
  const [title, setTitle] = useState(() => (source?.text ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_THREAD_TITLE));
  const candidates = Object.keys(parent.memberIds).filter(uid => uid !== myUid && parent.memberIds[uid]);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(source && source.senderId !== myUid && parent.memberIds[source.senderId] ? [source.senderId] : []),
  );
  const [tasks, setTasks] = useState<Record<string, LinkedTask>>({});
  const [showTasks, setShowTasks] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!title.trim()) { setError('Give the thread a title, e.g. "Fix the checkout button".'); return; }
    setSaving(true);
    setError('');
    try {
      await onCreate({ title, memberIds: [...selected], tasks: Object.values(tasks) });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The thread could not be created.');
      setSaving(false);
    }
  }

  return (
    <Dialog title={`New thread in ${parent.name || 'this chat'}`} icon={<MessagesSquare className="h-4 w-4" />} onClose={onClose} labelId="create-thread-title"
      footer={(
        <button type="button" onClick={() => void submit()} disabled={saving || !title.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white transition-all hover:bg-amber-600 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessagesSquare className="h-4 w-4" />}
          {saving ? 'Starting…' : `Start thread${selected.size ? ` with ${selected.size} ${selected.size === 1 ? 'person' : 'people'}` : ''}`}
        </button>
      )}>
      {source && (
        <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50/60 px-3 py-2 text-xs text-gray-600 dark:bg-amber-950/20 dark:text-gray-300">
          <span className="font-semibold">{source.senderName}:</span> {source.text.length > 160 ? `${source.text.slice(0, 160)}…` : source.text}
        </div>
      )}
      <div>
        <label htmlFor="thread-title" className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">What is this thread about? *</label>
        <input id="thread-title" autoFocus value={title} maxLength={MAX_THREAD_TITLE} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') void submit(); }}
          placeholder='e.g. Fix the checkout button' className={inputClass} />
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
          People involved <span className="font-normal">· you&apos;re added automatically; others in the chat can join later</span>
        </p>
        <MemberChecklist candidates={candidates} people={people} selected={selected} onChange={setSelected} />
      </div>
      <div>
        <button type="button" onClick={() => setShowTasks(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400">
          <ClipboardList className="h-3.5 w-3.5" />
          {Object.keys(tasks).length ? `${Object.keys(tasks).length} task${Object.keys(tasks).length === 1 ? '' : 's'} linked` : 'Link tasks (optional)'}
        </button>
        {showTasks && (
          <div className="mt-2">
            <TaskPicker
              selected={Object.fromEntries(Object.keys(tasks).map(id => [id, true]))}
              onToggle={(task, on) => setTasks(prev => {
                const next = { ...prev };
                if (on) next[task.id] = { id: task.id, title: task.title };
                else delete next[task.id];
                return next;
              })}
            />
          </div>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </Dialog>
  );
}

// ── Add people / link tasks ──────────────────────────────────────────────────

export function AddThreadPeopleModal({ thread, parent, people, onClose, onAdd }: {
  thread: ThreadConversation;
  parent: ThreadConversation | null;
  people: Record<string, PersonLite>;
  onClose: () => void;
  onAdd: (uids: string[]) => Promise<void>;
}) {
  const candidates = Object.keys(parent?.memberIds ?? {}).filter(uid => parent?.memberIds[uid] && !thread.memberIds[uid]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  return (
    <Dialog title="Add people to the thread" icon={<UserPlus className="h-4 w-4" />} onClose={onClose} labelId="thread-add-people-title"
      footer={(
        <button type="button" disabled={saving || selected.size === 0}
          onClick={async () => { setSaving(true); try { await onAdd([...selected]); } finally { setSaving(false); } }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Add {selected.size || ''}
        </button>
      )}>
      <p className="text-xs text-gray-500 dark:text-gray-400">People from {parent?.name || 'the parent chat'} who aren&apos;t in this thread yet.</p>
      <MemberChecklist candidates={candidates} people={people} selected={selected} onChange={setSelected} />
    </Dialog>
  );
}

export function LinkTasksModal({ thread, onClose, onToggle, onCreateTask }: {
  thread: ThreadConversation;
  onClose: () => void;
  onToggle: (task: LinkedTask, linked: boolean) => Promise<void>;
  onCreateTask: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  return (
    <Dialog title="Link tasks" icon={<Link2 className="h-4 w-4" />} onClose={onClose} labelId="thread-link-tasks-title"
      footer={(
        <div className="flex gap-2">
          <button type="button" onClick={onCreateTask}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-amber-300 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950/20">
            <Plus className="h-4 w-4" /> New task
          </button>
          <button type="button" onClick={onClose} className="flex-1 rounded-xl bg-amber-500 py-2.5 text-sm font-semibold text-white hover:bg-amber-600">Done</button>
        </div>
      )}>
      <p className="text-xs text-gray-500 dark:text-gray-400">Linked tasks show at the top of the thread with their live status.</p>
      <TaskPicker
        selected={thread.taskIds ?? {}}
        busyId={busyId}
        onToggle={async (task, on) => {
          setBusyId(task.id);
          try { await onToggle(task, on); } finally { setBusyId(null); }
        }}
      />
    </Dialog>
  );
}

// ── Threads list for a group ─────────────────────────────────────────────────

export function ThreadsPanel({ parent, myThreadIds, unreadByThread, onOpen, onJoin, onNew, onClose }: {
  parent: ThreadConversation;
  /** Threads the person is a member of. */
  myThreadIds: Set<string>;
  unreadByThread: Record<string, number>;
  onOpen: (threadId: string) => void;
  onJoin: (threadId: string, summary: ThreadSummary) => Promise<void>;
  onNew: () => void;
  onClose: () => void;
}) {
  const [showResolved, setShowResolved] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const entries = Object.entries(parent.threads ?? {}).sort((a, b) => b[1].createdAt - a[1].createdAt);
  const open = entries.filter(([, t]) => t.status !== 'resolved');
  const resolved = entries.filter(([, t]) => t.status === 'resolved');

  const row = ([id, t]: [string, ThreadSummary]) => {
    const mine = myThreadIds.has(id);
    const unread = unreadByThread[id] || 0;
    return (
      <div key={id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-zinc-800/60">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${t.status === 'resolved' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'}`}>
          {t.status === 'resolved' ? <CheckCircle2 className="h-4 w-4" /> : <MessagesSquare className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm ${unread ? 'font-bold text-gray-900 dark:text-white' : 'font-semibold text-gray-700 dark:text-gray-200'}`}>{t.title}</p>
          <p className="truncate text-[11px] text-gray-400">
            {t.createdByName} · {timeAgo(t.createdAt)} · <Users className="inline h-3 w-3" /> {t.memberCount}
            {t.taskCount ? <> · <ClipboardList className="inline h-3 w-3" /> {t.taskCount}</> : null}
          </p>
        </div>
        {unread > 0 && <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
        {mine ? (
          <button type="button" onClick={() => onOpen(id)} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20">Open</button>
        ) : t.status !== 'resolved' ? (
          <button type="button" disabled={joining === id}
            onClick={async () => { setJoining(id); try { await onJoin(id, t); } finally { setJoining(null); } }}
            className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-800">
            {joining === id ? 'Joining…' : 'Join'}
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <AeOverlay onClose={onClose} label="Threads" className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
      <div className="ae-pop-in flex h-full w-full max-w-md flex-col bg-white shadow-2xl dark:bg-zinc-900" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-zinc-800">
          <div>
            <h2 id="threads-panel-title" className="text-sm font-bold text-gray-900 dark:text-white">Threads</h2>
            <p className="text-xs text-gray-400">{parent.name} · {open.length} open</p>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" onClick={onNew}
              className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">
              <Plus className="h-3.5 w-3.5 stroke-[3]" /> New thread
            </button>
            <button onClick={onClose} aria-label="Close threads" autoFocus className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center px-6 py-14 text-center">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30"><MessagesSquare className="h-6 w-6 text-amber-500" /></span>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">No threads yet</p>
              <p className="mt-1 text-xs text-gray-400">Start a thread for one problem, add the people working on it, link its tasks, and resolve it when it&apos;s fixed.</p>
            </div>
          ) : (
            <>
              {open.length === 0 && <p className="px-3 py-4 text-xs text-gray-400">No open threads. Everything here is resolved.</p>}
              {open.map(row)}
              {resolved.length > 0 && (
                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                  <button type="button" onClick={() => setShowResolved(v => !v)} className="px-3 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    {showResolved ? 'Hide' : 'Show'} resolved ({resolved.length})
                  </button>
                  {showResolved && <div className="mt-1">{resolved.map(row)}</div>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AeOverlay>
  );
}

// ── Bar at the top of an open thread ─────────────────────────────────────────

export function ThreadBar({ thread, canModerate, onBack, onAddPeople, onLinkTasks, onUnlinkTask, onResolve, onReopen, onLeave, onDelete }: {
  thread: ThreadConversation;
  canModerate: boolean;
  onBack: () => void;
  onAddPeople: () => void;
  onLinkTasks: () => void;
  onUnlinkTask: (task: LinkedTask) => void;
  onResolve: () => void;
  onReopen: () => void;
  onLeave: () => void;
  onDelete: () => void;
}) {
  const taskIds = Object.keys(thread.taskIds ?? {});
  const tasks = useLinkedTasks(taskIds);
  const resolved = thread.status === 'resolved';
  const button = 'flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition-colors';

  return (
    <div className="shrink-0 border-b border-gray-100 bg-gray-50/70 px-5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onBack} className={`${button} text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100`}>
          <ChevronLeft className="h-3.5 w-3.5" /> {thread.parentName || 'Back'}
        </button>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resolved ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
          {resolved ? `Resolved${thread.resolvedByName ? ` by ${thread.resolvedByName}` : ''}` : 'Open'}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button type="button" onClick={onAddPeople} className={`${button} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800`}><UserPlus className="h-3.5 w-3.5" /> Add people</button>
          <button type="button" onClick={onLinkTasks} className={`${button} text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800`}><Link2 className="h-3.5 w-3.5" /> Tasks</button>
          {resolved ? (
            <button type="button" onClick={onReopen} className={`${button} text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/20`}><RotateCcw className="h-3.5 w-3.5" /> Reopen</button>
          ) : (
            <button type="button" onClick={onResolve} className={`${button} text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/20`}><CheckCircle2 className="h-3.5 w-3.5" /> Resolve</button>
          )}
          <button type="button" onClick={onLeave} className={`${button} text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-zinc-800`}><LogOut className="h-3.5 w-3.5" /> Leave</button>
          {canModerate && (
            <button type="button" onClick={onDelete} className={`${button} text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/20`}><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          )}
        </div>
      </div>
      {taskIds.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {taskIds.map(id => {
            const task = tasks[id];
            return (
              <span key={id} className="group/task flex max-w-full items-center gap-1.5 rounded-lg border border-gray-200 bg-white py-1 pl-2 pr-1 text-[11px] dark:border-zinc-700 dark:bg-zinc-800">
                <ClipboardList className="h-3 w-3 shrink-0 text-amber-500" />
                <a href="/ceo/tasks" className="truncate font-medium text-gray-700 hover:underline dark:text-gray-200" title="Open Tasks">
                  {task === undefined ? 'Loading…' : task === null ? 'Deleted task' : task.title}
                </a>
                {task && <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${statusTone(task.status)}`}>{task.status}</span>}
                <button type="button" aria-label="Unlink task" title="Unlink task"
                  onClick={() => onUnlinkTask({ id, title: task?.title ?? 'task' })}
                  className="rounded p-0.5 text-gray-300 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-zinc-700">
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Note in the parent chat ──────────────────────────────────────────────────

export function ThreadNotice({ threadRef, text, time, summary, isMember, onOpen, onJoin }: {
  threadRef: ThreadRef;
  text: string;
  time: string;
  /** The thread's current summary in the parent, if it still exists. */
  summary: ThreadSummary | undefined;
  isMember: boolean;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const exists = !!summary;
  const icon = threadRef.event === 'resolved'
    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
    : threadRef.event === 'deleted'
      ? <Trash2 className="h-3.5 w-3.5 text-gray-400" />
      : <MessagesSquare className="h-3.5 w-3.5 text-amber-500" />;
  return (
    <div className="my-2 flex justify-center">
      <div className="flex max-w-[90%] flex-wrap items-center justify-center gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs text-gray-600 dark:border-zinc-800 dark:bg-zinc-800/60 dark:text-gray-300">
        {icon}
        <span>{text.replace(/^(🧵|✅|🗑️)\s*/u, '')}</span>
        <span className="text-[10px] text-gray-400">{time}</span>
        {exists && threadRef.event !== 'deleted' && (
          isMember ? (
            <button type="button" onClick={onOpen} className="font-semibold text-amber-600 hover:underline dark:text-amber-400">Open thread</button>
          ) : summary.status !== 'resolved' ? (
            <button type="button" onClick={onJoin} className="font-semibold text-amber-600 hover:underline dark:text-amber-400">Join thread</button>
          ) : null
        )}
      </div>
    </div>
  );
}
