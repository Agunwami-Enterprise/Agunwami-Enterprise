'use client';

/**
 * Department workstation → Tasks (/ws/tasks), from the design's tabs:
 * My Tasks, My To-do, Sprint Tasks and Team. Tasks are AE Hub's staffTasks
 * (live); moving or adding one writes AE Hub's own fields, so it shows the
 * same there. The to-do list is personal and kept in AE.
 */

import { useCallback, useEffect, useState } from 'react';
import { CheckSquare, ClipboardList, Clock3, LayoutGrid, List, ListTodo, Plus, Trash2, Users, Zap } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import type { TodoItem } from '@/app/api/ws/todos/route';
import { createTask, isOverdue, setTaskStage, useDepartmentTeam, useStaffTasks, type WsTask } from '../data';
import { Card, Empty, ErrorNote, PageHeader, StatTile, Tabs, btnGhost, btnPrimary, field } from './ui';
import { Overlay, TaskBoard, TaskDialog, TaskList } from './task-board';

type Tab = 'mine' | 'todo' | 'sprint' | 'team';

export default function Tasks() {
  const { user } = useAuth();
  const access = useWorkstationAccess();
  const { tasks, loading, error } = useStaffTasks();
  const { members } = useDepartmentTeam();
  const [tab, setTab] = useState<Tab>('mine');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [open, setOpen] = useState<WsTask | null>(null);
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const every = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  const uid = user?.uid ?? '';
  const myName = user?.displayName || '';
  const me = { uid, name: myName || user?.email || 'Team member', email: user?.email || '' };
  const teamUids = new Set(members.map(m => m.uid));
  const isMine = (t: WsTask) => t.assigneeUids.includes(uid) || (!!myName && t.assigneeNames.includes(myName));
  const mine = tasks.filter(isMine);
  const team = tasks.filter(t => t.assigneeUids.some(id => teamUids.has(id)) || isMine(t));
  const sprint = team.filter(t => t.isSprint);
  const today = now ?? new Date(0);
  const canMove = (t: WsTask) => isMine(t) || t.createdByUid === uid || access.isDepartmentAdmin || access.kind === 'ceo';
  const isAdmin = access.isDepartmentAdmin || access.kind === 'ceo';

  const shown = tab === 'mine' ? mine : tab === 'sprint' ? sprint : team;
  const myOpen = mine.filter(t => t.stage !== 'done');

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Tasks & Activities" subtitle="Your tasks, the team's work and your own to-do list"
        actions={<button className={btnPrimary} onClick={() => setAdding(true)}><Plus className="h-4 w-4" aria-hidden /> Add Task</button>} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Assigned to Me" icon={CheckSquare} iconClass="text-[#f59e0b]" value={loading ? '…' : String(myOpen.length)} sub="Not done yet" />
        <StatTile label="In Progress" icon={Clock3} iconClass="text-[#2563eb]" value={loading ? '…' : String(mine.filter(t => t.stage === 'in-progress').length)} sub="Yours, being worked on" />
        <StatTile label="Overdue" icon={ClipboardList} iconClass="text-[#ef4444]" value={loading || !now ? '…' : String(myOpen.filter(t => isOverdue(t, today)).length)} sub="Yours, past their due date" />
        <StatTile label="Completed" icon={Zap} iconClass="text-[#16a34a]" value={loading ? '…' : String(mine.filter(t => t.stage === 'done').length)} sub="Yours, all time" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { id: 'mine', label: 'My Tasks', badge: myOpen.length },
        { id: 'todo', label: 'My To-do' },
        { id: 'sprint', label: 'Sprint Tasks' },
        { id: 'team', label: 'Team' },
      ]} />

      {tab === 'todo' ? <TodoList /> : (
        <Card title={tab === 'mine' ? 'My Tasks' : tab === 'sprint' ? 'Sprint Tasks' : 'Team Tasks'} icon={tab === 'team' ? Users : tab === 'sprint' ? Zap : CheckSquare} action={
          <div role="radiogroup" aria-label="View" className="flex rounded-lg bg-[#f0f0f0] p-0.5 dark:bg-white/8">
            {([['board', LayoutGrid], ['list', List]] as const).map(([id, Icon]) => (
              <button key={id} role="radio" aria-checked={view === id} aria-label={id === 'board' ? 'Board' : 'List'} onClick={() => setView(id)}
                className={`rounded-md px-2.5 py-1 ${view === id ? 'bg-white text-[#292929] shadow-sm dark:bg-[#2a2a2a] dark:text-white' : 'text-[#8a8a8a]'}`}>
                <Icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>
        }>
          {loading || !now ? <Empty>Loading…</Empty> : shown.length === 0 ? (
            <Empty>{tab === 'mine' ? 'Nothing is assigned to you.' : tab === 'sprint' ? 'No sprint tasks for the team yet. Sprints are planned in AE Hub.' : 'No tasks for the team yet.'}</Empty>
          ) : view === 'board' ? <TaskBoard tasks={shown} now={today} onOpen={setOpen} /> : <TaskList tasks={shown} now={today} onOpen={setOpen} />}
        </Card>
      )}

      {open && <TaskDialog task={open} canMove={canMove(open)} onClose={() => setOpen(null)} onMove={stage => setTaskStage(open.id, stage, me)} />}
      {adding && (
        <AddTaskDialog
          people={isAdmin ? members.map(m => ({ uid: m.uid, name: m.name, email: m.email })) : [{ uid, name: me.name, email: me.email }]}
          defaultUid={uid}
          isAdmin={isAdmin}
          onClose={() => setAdding(false)}
          onSave={async input => { await createTask(input, { uid, name: me.name }); setAdding(false); }}
        />
      )}
    </div>
  );
}

function AddTaskDialog({ people, defaultUid, isAdmin, onClose, onSave }: {
  people: Array<{ uid: string; name: string; email: string }>;
  defaultUid: string;
  isAdmin: boolean;
  onClose: () => void;
  onSave: (input: Parameters<typeof createTask>[0]) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeUid, setAssigneeUid] = useState(people.some(p => p.uid === defaultUid) ? defaultUid : people[0]?.uid ?? '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  return (
    <Overlay title="Add New Task" onClose={onClose} footer={
      <>
        <button className={btnGhost} onClick={onClose}>Cancel</button>
        <button className={btnPrimary} disabled={saving || !title.trim() || !dueDate} onClick={async () => {
          setSaving(true);
          setError('');
          try {
            await onSave({ title, description, priority, dueDate, assignee: people.find(p => p.uid === assigneeUid) ?? null });
          } catch (err) {
            setError(err instanceof Error ? err.message : 'The task could not be added.');
            setSaving(false);
          }
        }}>{saving ? 'Adding…' : 'Add Task'}</button>
      </>
    }>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Task Title</span>
        <input className={field} value={title} maxLength={140} onChange={e => setTitle(e.target.value)} autoFocus />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description</span>
        <textarea className={`${field} min-h-[80px]`} value={description} maxLength={2000} onChange={e => setDescription(e.target.value)} />
      </label>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Assign To</span>
        <select className={field} value={assigneeUid} onChange={e => setAssigneeUid(e.target.value)} disabled={!isAdmin}>
          {people.map(p => <option key={p.uid} value={p.uid}>{p.name}{p.uid === defaultUid ? ' (you)' : ''}</option>)}
        </select>
        {!isAdmin && <span className="mt-1 block text-[12px] text-[#8a8a8a]">Only the department admin assigns tasks to others.</span>}
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Due Date</span>
          <input type="date" className={field} value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Priority</span>
          <select className={field} value={priority} onChange={e => setPriority(e.target.value as typeof priority)}>
            {(['Low', 'Medium', 'High', 'Critical'] as const).map(p => <option key={p}>{p}</option>)}
          </select>
        </label>
      </div>
      <p className="text-[12px] text-[#8a8a8a]">The task is added to AE Hub too.</p>
      {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}

function TodoList() {
  const [items, setItems] = useState<TodoItem[] | null>(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ws/todos', { cache: 'no-store' })
      .then(res => res.json())
      .then(body => { if (!cancelled) setItems(body.items ?? []); })
      .catch(() => { if (!cancelled) { setItems([]); setError('Your to-do list could not be loaded.'); } });
    return () => { cancelled = true; };
  }, []);

  const save = useCallback(async (next: TodoItem[]) => {
    const previous = items;
    setItems(next);
    try {
      const res = await fetch('/api/ws/todos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: next }) });
      if (!res.ok) throw new Error();
      setError('');
    } catch {
      setItems(previous);
      setError('That change could not be saved. Please try again.');
    }
  }, [items]);

  const list = items ?? [];
  const pending = list.filter(i => !i.done);
  const done = list.filter(i => i.done);

  return (
    <Card title="My To-do" icon={ListTodo}>
      <form className="mb-4 flex gap-2" onSubmit={e => {
        e.preventDefault();
        if (!text.trim()) return;
        void save([{ id: `t${Date.now().toString(36)}`, text: text.trim(), done: false, createdAt: new Date().toISOString() }, ...list]);
        setText('');
      }}>
        <input className={field} value={text} maxLength={300} onChange={e => setText(e.target.value)} placeholder="Add something to do" aria-label="New to-do" />
        <button type="submit" className={btnPrimary} disabled={!text.trim()}>Add</button>
      </form>
      {error && <p role="alert" className="mb-3 text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
      {items === null ? <Empty>Loading…</Empty> : list.length === 0 ? <Empty>Nothing on your list.</Empty> : (
        <ul className="space-y-1">
          {[...pending, ...done].map(item => (
            <li key={item.id} className="group flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]">
              <input type="checkbox" checked={item.done} className="h-4 w-4 accent-[#f5bd02]" aria-label={item.text}
                onChange={() => void save(list.map(i => (i.id === item.id ? { ...i, done: !i.done } : i)))} />
              <span className={`flex-1 text-[14px] ${item.done ? 'text-[#a3a3a3] line-through' : 'text-[#292929] dark:text-gray-100'}`}>{item.text}</span>
              <button className="text-[#a3a3a3] opacity-0 hover:text-[#dc2626] group-hover:opacity-100 focus:opacity-100" aria-label={`Delete ${item.text}`}
                onClick={() => void save(list.filter(i => i.id !== item.id))}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {done.length > 0 && (
        <button className="mt-3 text-[13px] font-medium text-[#8a8a8a] hover:text-[#525252]" onClick={() => void save(pending)}>Clear {done.length} done</button>
      )}
    </Card>
  );
}
