'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, ClipboardList, Clock3, LayoutGrid, List, ListTodo, Plus, Search, X } from 'lucide-react';
import { subscribeTasks } from '@/modules/tasks/services';
import { SkeletonTasks } from '@/app/components/ceo/Skeleton';
import {
  toLiveTask,
  toPersonalTodo,
  toProjectTask,
  type ProjectTaskResponse,
  type ProjectTasksResponse,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from '@/modules/tasks/task-view-model';
type ViewMode = 'board' | 'list';

const STATUS_STYLES: Record<TaskStatus, string> = {
  'To Do': 'border-gray-200 bg-gray-100 text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-300',
  'In Progress': 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-300',
  'In Review': 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300',
  Completed: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300',
  Overdue: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300',
};

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  Low: 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  Medium: 'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  High: 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
  Critical: 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300',
};

const BOARD_COLUMNS: TaskStatus[] = ['To Do', 'In Progress', 'In Review', 'Completed', 'Overdue'];

export default function TasksPage() {
  const [liveTasks, setLiveTasks] = useState<Task[]>([]);
  const [projectTasks, setProjectTasks] = useState<Task[]>([]);
  const [personalTodos, setPersonalTodos] = useState<Task[]>([]);
  const [projectLoadError, setProjectLoadError] = useState<string | null>(null);
  const [todoLoadError, setTodoLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All priorities');
  const [statusFilter, setStatusFilter] = useState('All statuses');
  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = subscribeTasks(data => {
      if (cancelled) return;
      setLiveTasks(data.map(toLiveTask));
      setLoading(false);
    });

    fetch('/api/ceo/tasks?source=projects')
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Unable to load project tasks (${response.status}).`);
        }
        return response.json() as Promise<ProjectTasksResponse>;
      })
      .then(data => {
        if (cancelled) return;
        setProjectTasks(data.tasks.map(toProjectTask));
        setProjectLoadError(null);
        setLoading(false);
      })
      .catch(error => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unable to load project tasks.';
        setProjectLoadError(message);
        setLoading(false);
      });

    fetch('/api/ceo/tasks?source=todos')
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Unable to load personal to-dos (${response.status}).`);
        }
        return response.json() as Promise<ProjectTaskResponse[]>;
      })
      .then(data => {
        if (!cancelled) setPersonalTodos(data.map(toPersonalTodo));
      })
      .catch(error => {
        if (!cancelled) {
          setTodoLoadError(error instanceof Error ? error.message : 'Unable to load personal to-dos.');
        }
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const allTasks = useMemo(() => {
    const liveIds = new Set(liveTasks.map(task => task.id));
    return [
      ...liveTasks,
      ...projectTasks.filter(task => {
        const separator = task.id.indexOf(':');
        const sourceId = separator >= 0 ? task.id.slice(separator + 1) : task.id;
        return !liveIds.has(sourceId);
      }),
      ...personalTodos,
    ];
  }, [liveTasks, personalTodos, projectTasks]);

  const filteredTasks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return allTasks.filter(task =>
      (priorityFilter === 'All priorities' || task.priority === priorityFilter) &&
      (statusFilter === 'All statuses' || task.status === statusFilter) &&
      (!search ||
        task.title.toLowerCase().includes(search) ||
        task.assignee.toLowerCase().includes(search) ||
        task.project?.toLowerCase().includes(search) ||
        task.department.toLowerCase().includes(search)),
    );
  }, [allTasks, priorityFilter, query, statusFilter]);

  const counts = useMemo(() => ({
    total: allTasks.length,
    inProgress: allTasks.filter(task => task.status === 'In Progress').length,
    inReview: allTasks.filter(task => task.status === 'In Review').length,
    completed: allTasks.filter(task => task.status === 'Completed').length,
    toDo: allTasks.filter(task => task.status === 'To Do').length,
    overdue: allTasks.filter(task => task.status === 'Overdue').length,
  }), [allTasks]);
  if (loading) return <SkeletonTasks />;

  const metrics = [
    { label: 'Total Tasks', value: counts.total, icon: <ClipboardList className="h-4 w-4" />, color: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40 dark:text-blue-300' },
    { label: 'To Do', value: counts.toDo, icon: <Clock3 className="h-4 w-4" />, color: 'text-gray-600 bg-gray-100 dark:bg-white/5 dark:text-gray-300' },
    { label: 'In Progress', value: counts.inProgress, icon: <Activity className="h-4 w-4" />, color: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300' },
    { label: 'In Review', value: counts.inReview, icon: <Search className="h-4 w-4" />, color: 'text-violet-600 bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300' },
    { label: 'Completed', value: counts.completed, icon: <CheckCircle2 className="h-4 w-4" />, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300' },
    { label: 'Overdue', value: counts.overdue, icon: <AlertTriangle className="h-4 w-4" />, color: 'text-rose-600 bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300' },
  ];

  return (
    <div className="w-full min-w-0 flex-1 space-y-5 p-4 md:p-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Task Management</h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Live staff and project tasks across your organization
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/ceo/tasks/create/task" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-800 shadow-xs transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700">
            <Plus className="h-4 w-4" /> Create Task
          </Link>
          <Link href="/ceo/tasks/create/sprint" className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-800 shadow-xs transition hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-200 dark:hover:bg-zinc-700">
            <ClipboardList className="h-4 w-4" /> Create Sprint Task
          </Link>
          <Link href="/ceo/tasks/create/todo" className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5bd02] px-3.5 py-2.5 text-xs font-bold text-gray-900 shadow-xs transition hover:brightness-95">
            <ListTodo className="h-4 w-4" /> Create To Do
          </Link>
        </div>
      </header>

      {projectLoadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {projectLoadError} Showing available staff tasks.
        </div>
      )}
      {todoLoadError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
          {todoLoadError} Personal to-dos are unavailable.
        </div>
      )}

      <section aria-label="Task summary" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {metrics.map(metric => (
          <div key={metric.label} className="flex items-center justify-between rounded-2xl border border-gray-200/80 bg-white p-4 shadow-xs dark:border-white/8 dark:bg-[#1e1e1e]">
            <div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{metric.label}</p>
              <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">{metric.value}</p>
            </div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${metric.color}`}>{metric.icon}</span>
          </div>
        ))}
      </section>

      <section aria-label="Task filters" className="flex flex-col gap-3 rounded-2xl border border-gray-200/80 bg-white p-3 shadow-xs dark:border-white/8 dark:bg-[#1e1e1e] sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search tasks, projects, departments, or staff..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/5 dark:bg-[#252525] dark:text-white"
            />
          </label>
          <select
            value={priorityFilter}
            onChange={event => setPriorityFilter(event.target.value)}
            aria-label="Filter by priority"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/5 dark:bg-[#252525] dark:text-gray-200"
          >
            {['All priorities', 'Critical', 'High', 'Medium', 'Low'].map(option => <option key={option}>{option}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700 outline-none focus:border-[#f5bd02] dark:border-white/5 dark:bg-[#252525] dark:text-gray-200"
          >
            {['All statuses', ...BOARD_COLUMNS].map(option => <option key={option}>{option}</option>)}
          </select>
        </div>
        <div className="flex w-fit items-center gap-1 rounded-xl border border-gray-200/60 bg-gray-100 p-1 dark:border-white/5 dark:bg-[#252525]">
          {([
            ['board', 'Board', <LayoutGrid key="board-icon" className="h-3.5 w-3.5" />],
            ['list', 'List', <List key="list-icon" className="h-3.5 w-3.5" />],
          ] as const).map(([mode, label, icon]) => (
            <button
              key={mode}
              type="button"
              aria-pressed={viewMode === mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-xs dark:bg-[#1e1e1e] dark:text-white'
                  : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              {icon}{label}
            </button>
          ))}
        </div>
      </section>

      {viewMode === 'board' ? (
        <section aria-label="Tasks by status" className="flex gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map(status => {
            const columnTasks = filteredTasks.filter(task => task.status === status);
            return (
              <div key={status} className="w-[280px] min-w-[280px] shrink-0">
                <div className="mb-3 flex items-center justify-between rounded-xl border border-gray-200/80 bg-gray-50 px-3.5 py-2.5 dark:border-white/8 dark:bg-white/[0.02]">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">{status}</span>
                  <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-bold text-gray-600 dark:border-white/10 dark:bg-zinc-900 dark:text-gray-400">{columnTasks.length}</span>
                </div>
                <div className="flex min-h-36 flex-col gap-3">
                  {columnTasks.map(task => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTask(task)}
                      className="rounded-xl border border-gray-200 bg-white p-4 text-left shadow-xs transition hover:border-[#f5bd02]/60 hover:shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]"
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">{task.title}</span>
                        {task.kind && task.kind !== 'task' && <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] font-bold uppercase text-gray-600 dark:bg-white/5 dark:text-gray-300">{task.kind === 'todo' ? 'To Do' : 'Sprint'}</span>}
                      </span>
                      {(task.project || task.department) && (
                        <span className="mt-2 block truncate text-[11px] text-gray-500 dark:text-gray-400">
                          {[task.project, task.department].filter(Boolean).join(' · ')}
                        </span>
                      )}
                      <span className="mt-3 flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-gray-600 dark:text-gray-300">{task.assignee}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span>
                      </span>
                      {task.dueDate && <span className="mt-2 block text-[10px] text-gray-400 dark:text-gray-500">Due {task.dueDate}</span>}
                    </button>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed border-gray-200 text-xs text-gray-400 dark:border-white/10">
                      No tasks
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ) : (
        <section aria-label="Task list" className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-white/8 dark:bg-[#1e1e1e]">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/70 dark:border-white/5 dark:bg-white/[0.02]">
                  {['Task', 'Project', 'Department', 'Assignee', 'Type', 'Stage', 'Priority', 'Target Date'].map(column => (
                    <th key={column} className="px-5 py-3.5 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {filteredTasks.map(task => (
                  <tr key={task.id} className="group cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-white/[0.03]" onClick={() => setSelectedTask(task)}>
                    <td className="max-w-[280px] px-5 py-3.5">
                      <span className="block truncate text-xs font-bold text-gray-900 group-hover:text-[#b98a00] dark:text-white">{task.title}</span>
                      {task.description && <span className="mt-1 block truncate text-[10px] text-gray-400">{task.description}</span>}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{task.project || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{task.department || '—'}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{task.assignee}</td>
                    <td className="px-5 py-3.5 text-xs text-gray-600 dark:text-gray-300">{task.kind === 'todo' ? 'Personal To Do' : task.kind === 'sprint' ? 'Sprint Task' : 'Task'}</td>
                    <td className="px-5 py-3.5"><span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${STATUS_STYLES[task.status]}`}>{task.status}</span></td>
                    <td className="px-5 py-3.5"><span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${PRIORITY_STYLES[task.priority]}`}>{task.priority}</span></td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-xs text-gray-500 dark:text-gray-400">{task.dueDate || '—'}</td>
                  </tr>
                ))}
                {filteredTasks.length === 0 && (
                  <tr><td colSpan={8} className="py-14 text-center text-xs text-gray-400">{projectLoadError || todoLoadError ? 'Some task sources could not be loaded. Check the messages above.' : 'No tasks match these filters.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onClick={event => { if (event.target === event.currentTarget) setSelectedTask(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="task-detail-title" className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4 dark:border-white/8">
              <div>
                <h2 id="task-detail-title" className="text-sm font-bold text-gray-900 dark:text-white">{selectedTask.title}</h2>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Task details</p>
              </div>
              <button type="button" aria-label="Close task details" onClick={() => setSelectedTask(null)} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"><X className="h-4 w-4" /></button>
            </div>
            <dl className="grid grid-cols-2 gap-4 p-5">
              <Detail label="Status" value={selectedTask.status} />
              <Detail label="Priority" value={selectedTask.priority} />
              <Detail label="Type" value={selectedTask.kind === 'todo' ? 'Personal To Do' : selectedTask.kind === 'sprint' ? 'Sprint Task' : 'Task'} />
              <Detail label="Assignee" value={selectedTask.assignee} />
              <Detail label="Due date" value={selectedTask.dueDate || 'Not specified'} />
              <Detail label="Project" value={selectedTask.project || '—'} />
              <Detail label="Department" value={selectedTask.department || '—'} />
              {selectedTask.description && <div className="col-span-2"><Detail label="Description" value={selectedTask.description} /></div>}
            </dl>
          </section>
        </div>
      )}

    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-1 break-words text-xs font-medium text-gray-800 dark:text-gray-100">{value}</dd>
    </div>
  );
}
