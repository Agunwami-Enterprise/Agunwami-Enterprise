'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, ListTodo, LoaderCircle, Plus, Save, Trash2 } from 'lucide-react';

type CreationKind = 'task' | 'sprint' | 'todo';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';

interface ProjectOption {
  id: string;
  name: string;
  departments: Array<{ id: string; name: string }>;
  assignees: Assignee[];
}

interface Assignee {
  id: string;
  name: string;
  department: string;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface Draft {
  title: string;
  description: string;
  projectId: string;
  departmentId: string;
  assigneeUid: string;
  priority: TaskPriority;
  startDate: string;
  dueDate: string;
}

interface DraftSubTask {
  title: string;
  date: string;
  priority: TaskPriority;
}

const PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const PAGE_CONTENT: Record<CreationKind, { title: string; subtitle: string; entity: string }> = {
  task: {
    title: 'Create Staff Task',
    subtitle: 'Create an assignment and optionally assign it to a staff member.',
    entity: 'Task',
  },
  sprint: {
    title: 'Create Sprint Task',
    subtitle: 'Set the sprint schedule, project, department, and individual sprint tasks.',
    entity: 'Sprint',
  },
  todo: {
    title: 'Create Personal To Do',
    subtitle: 'Add a private to-do to your list and associate it with a live project department.',
    entity: 'Personal to-do',
  },
};

export default function TaskCreatePage({ kind }: { kind: CreationKind }) {
  const router = useRouter();
  const content = PAGE_CONTENT[kind];
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [enterpriseDepartments, setEnterpriseDepartments] = useState<DepartmentOption[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [assigneesLoading, setAssigneesLoading] = useState(kind !== 'todo');
  const [departmentsLoading, setDepartmentsLoading] = useState(kind !== 'todo');
  const [projectError, setProjectError] = useState<string | null>(null);
  const [assigneeError, setAssigneeError] = useState<string | null>(null);
  const [departmentError, setDepartmentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<Draft>({
    title: '',
    description: '',
    projectId: '',
    departmentId: '',
    assigneeUid: '',
    priority: kind === 'sprint' ? 'High' : 'Medium',
    startDate: '',
    dueDate: '',
  });
  const [subTasks, setSubTasks] = useState<DraftSubTask[]>([{ title: '', date: '', priority: 'Medium' }]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ceo/tasks?mode=projects')
      .then(async response => {
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Unable to load projects (${response.status}).`);
        }
        return response.json() as Promise<ProjectOption[]>;
      })
      .then(data => {
        if (!cancelled) setProjects(data);
      })
      .catch(error => {
        if (!cancelled) setProjectError(error instanceof Error ? error.message : 'Unable to load projects.');
      })
      .finally(() => {
        if (!cancelled) setProjectsLoading(false);
      });

    if (kind !== 'todo') {
      fetch('/api/ceo/tasks?mode=departments')
        .then(async response => {
          if (!response.ok) {
            const result = await response.json().catch(() => null);
            throw new Error(result?.error || `Unable to load departments (${response.status}).`);
          }
          return response.json() as Promise<DepartmentOption[]>;
        })
        .then(data => {
          if (!cancelled) setEnterpriseDepartments(data);
        })
        .catch(error => {
          if (!cancelled) setDepartmentError(error instanceof Error ? error.message : 'Unable to load Enterprise departments.');
        })
        .finally(() => {
          if (!cancelled) setDepartmentsLoading(false);
        });

      fetch('/api/ceo/tasks?mode=assignees')
        .then(async response => {
          if (!response.ok) {
            const result = await response.json().catch(() => null);
            throw new Error(result?.error || `Unable to load staff (${response.status}).`);
          }
          return response.json() as Promise<Assignee[]>;
        })
        .then(data => {
          if (!cancelled) setAssignees(data);
        })
        .catch(error => {
          if (!cancelled) setAssigneeError(error instanceof Error ? error.message : 'Unable to load staff.');
        })
        .finally(() => {
          if (!cancelled) setAssigneesLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [kind]);

  const selectedProject = projects.find(project => project.id === draft.projectId);
  const availableDepartments = selectedProject?.departments ?? enterpriseDepartments;
  const assigneeOptions = selectedProject?.assignees ?? assignees;
  const selectedDepartment = availableDepartments.find(department => department.id === draft.departmentId);
  const currentAssigneesLoading = selectedProject ? projectsLoading : assigneesLoading;
  const currentAssigneeError = selectedProject ? null : assigneeError;
  const availableAssignees = assigneeOptions.filter(assignee =>
    !selectedDepartment ||
    !assignee.department ||
    assignee.department.toLowerCase() === selectedDepartment.name.toLowerCase(),
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSubmitError(null);

    const selectedAssignee = availableAssignees.find(assignee => assignee.id === draft.assigneeUid);
    const sprintTasks = subTasks
      .filter(subTask => subTask.title.trim())
      .map(subTask => ({ ...subTask, title: subTask.title.trim(), date: subTask.date || draft.dueDate }));

    const payload = kind === 'todo'
      ? {
          kind,
          title: draft.title.trim(),
          description: draft.description.trim(),
          projectId: draft.projectId || undefined,
          departmentId: draft.departmentId,
          priority: draft.priority,
          dueDate: draft.dueDate,
        }
      : {
          kind,
          title: draft.title.trim(),
          description: draft.description.trim(),
          projectId: draft.projectId || undefined,
          departmentId: draft.departmentId,
          assigneeUid: draft.assigneeUid || undefined,
          assigneeName: selectedAssignee?.name,
          priority: draft.priority,
          startDate: kind === 'sprint' ? draft.startDate : undefined,
          dueDate: draft.dueDate,
          subTasks: kind === 'sprint' ? sprintTasks : undefined,
        };

    try {
      const response = await fetch('/api/ceo/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || `Unable to create ${content.entity.toLowerCase()}.`);
      router.push('/ceo/tasks');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : `Unable to create ${content.entity.toLowerCase()}.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button type="button" onClick={() => router.push('/ceo/tasks')} className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to tasks
          </button>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{content.title}</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{content.subtitle}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f5bd02]/15 text-[#987300] dark:text-[#f5bd02]">
          {kind === 'todo' ? <ListTodo className="h-5 w-5" /> : kind === 'sprint' ? <ClipboardList className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {submitError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">{submitError}</div>}
        {projectError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">{projectError}</div>}

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/8 dark:bg-[#1e1e1e] md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-white/8">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300"><ClipboardList className="h-4 w-4" /></span>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Task Details</h2>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Enter the task information and project ownership.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{kind === 'sprint' ? 'Sprint Name' : kind === 'todo' ? 'To-Do Title' : 'Task Title'}</span>
              <input required maxLength={160} value={draft.title} onChange={event => setDraft(current => ({ ...current, title: event.target.value }))} placeholder={kind === 'sprint' ? 'e.g. Product launch sprint' : 'Enter a clear title'} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{kind === 'sprint' ? 'Sprint Objective' : 'Description'} <span className="font-normal text-gray-400">(optional)</span></span>
              <textarea rows={3} maxLength={5000} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} placeholder="Add context or instructions" className="w-full resize-y rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Project</span>
              <select required={kind === 'todo'} disabled={projectsLoading && kind === 'todo'} value={draft.projectId} onChange={event => setDraft(current => ({ ...current, projectId: event.target.value, departmentId: '', assigneeUid: '' }))} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#f5bd02] disabled:opacity-60 dark:border-white/10 dark:bg-[#282828] dark:text-white">
                {kind !== 'todo'
                  ? <option value="">Enterprise (no project)</option>
                  : <option value="">{projectsLoading ? 'Loading projects…' : 'Select project'}</option>}
                {projects.map(project => <option key={project.id} value={project.id}>{project.name}</option>)}
              </select>
              {kind !== 'todo' && <span className="mt-1 block text-[10px] text-gray-500">Tasks without a project are saved in Enterprise.</span>}
              {!projectsLoading && projects.length === 0 && !projectError && kind === 'todo' && <span className="mt-1 block text-[10px] text-rose-600">No configured projects are available.</span>}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Department</span>
              <select required disabled={departmentsLoading || availableDepartments.length === 0} value={draft.departmentId} onChange={event => setDraft(current => ({ ...current, departmentId: event.target.value, assigneeUid: '' }))} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#f5bd02] disabled:opacity-60 dark:border-white/10 dark:bg-[#282828] dark:text-white">
                <option value="">{departmentsLoading ? 'Loading departments…' : 'Select department'}</option>
                {availableDepartments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
              </select>
              {!departmentsLoading && availableDepartments.length === 0 && <span className="mt-1 block text-[10px] text-rose-600">{selectedProject ? 'This project has no departments in its live endpoint.' : 'No Enterprise departments are available.'}</span>}
            </label>
            {kind !== 'todo' && (
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Assignee <span className="font-normal text-gray-400">(optional)</span></span>
                <select value={draft.assigneeUid} onChange={event => setDraft(current => ({ ...current, assigneeUid: event.target.value }))} disabled={currentAssigneesLoading || !draft.departmentId || availableAssignees.length === 0} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none transition focus:border-[#f5bd02] disabled:opacity-60 dark:border-white/10 dark:bg-[#282828] dark:text-white">
                  <option value="">{currentAssigneesLoading ? 'Loading staff directory…' : 'Unassigned'}</option>
                  {availableAssignees.map(assignee => <option key={assignee.id} value={assignee.id}>{assignee.name}{assignee.department ? ` — ${assignee.department}` : ''}</option>)}
                </select>
                {currentAssigneeError && <span role="alert" className="mt-1 block text-[10px] text-rose-600">{currentAssigneeError} You can still save this task unassigned.</span>}
                {!currentAssigneesLoading && !currentAssigneeError && draft.departmentId && availableAssignees.length === 0 && <span className="mt-1 block text-[10px] text-amber-600">{selectedProject ? 'No active staff in this project department.' : 'No active Enterprise staff in this department.'}</span>}
                {departmentError && !selectedProject && <span role="alert" className="mt-1 block text-[10px] text-rose-600">{departmentError}</span>}
              </label>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/8 dark:bg-[#1e1e1e] md:p-6">
          <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-white/8">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-300"><CalendarDays className="h-4 w-4" /></span>
            <div>
              <h2 className="text-sm font-bold text-gray-900 dark:text-white">Schedule & Priority</h2>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Set dates and a priority level for this {content.entity.toLowerCase()}.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === 'sprint' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Start Date</span>
                <input required type="date" value={draft.startDate} onChange={event => setDraft(current => ({ ...current, startDate: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
              </label>
            )}
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">{kind === 'sprint' ? 'End Date' : 'Due Date'}{kind === 'todo' ? ' (optional)' : ''}</span>
              <input required={kind !== 'todo'} type="date" min={kind === 'sprint' ? draft.startDate : undefined} value={draft.dueDate} onChange={event => setDraft(current => ({ ...current, dueDate: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">Priority</span>
              <select value={draft.priority} onChange={event => setDraft(current => ({ ...current, priority: event.target.value as TaskPriority }))} className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white">
                {PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
              </select>
            </label>
          </div>
        </section>

        {kind === 'sprint' && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-white/8 dark:bg-[#1e1e1e] md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-gray-100 pb-4 dark:border-white/8">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/30 dark:text-violet-300"><ClipboardList className="h-4 w-4" /></span>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">Sprint Tasks</h2>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Add the work items included in this sprint.</p>
                </div>
              </div>
              <button type="button" onClick={() => setSubTasks(items => [...items, { title: '', date: '', priority: 'Medium' }])} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"><Plus className="h-3.5 w-3.5" /> Add task</button>
            </div>
            <div className="space-y-3">
              {subTasks.map((subTask, index) => (
                <div key={index} className="grid items-end gap-3 rounded-xl bg-gray-50 p-3 dark:bg-white/[0.03] sm:grid-cols-[1fr_160px_130px_auto]">
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Task {index + 1}</span>
                    <input required value={subTask.title} onChange={event => setSubTasks(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item))} placeholder="Sprint task title" className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Target Date</span>
                    <input type="date" min={draft.startDate} max={draft.dueDate} value={subTask.date} onChange={event => setSubTasks(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, date: event.target.value } : item))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-900 outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#282828] dark:text-white" />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-[11px] font-semibold text-gray-600 dark:text-gray-400">Priority</span>
                    <select value={subTask.priority} onChange={event => setSubTasks(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, priority: event.target.value as TaskPriority } : item))} className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-gray-900 dark:border-white/10 dark:bg-[#282828] dark:text-white">
                      {PRIORITIES.map(priority => <option key={priority}>{priority}</option>)}
                    </select>
                  </label>
                  <button type="button" disabled={subTasks.length === 1} aria-label={`Remove task ${index + 1}`} onClick={() => setSubTasks(items => items.filter((_, itemIndex) => itemIndex !== index))} className="flex h-9 items-center justify-center rounded-lg px-2 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:hover:bg-rose-950/30"><Trash2 className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="flex flex-wrap justify-end gap-2 pb-4">
          <button type="button" disabled={saving} onClick={() => router.push('/ceo/tasks')} className="rounded-xl border border-gray-200 px-4 py-2.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5">Cancel</button>
          <button type="submit" disabled={saving || projectsLoading || projects.length === 0 || !draft.projectId || !draft.departmentId || (kind === 'sprint' && !subTasks.some(task => task.title.trim()))} className="inline-flex items-center gap-1.5 rounded-xl bg-[#f5bd02] px-5 py-2.5 text-xs font-bold text-gray-900 shadow-xs transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Saving…</> : <><Save className="h-4 w-4" /> {kind === 'todo' ? 'Create To Do' : kind === 'sprint' ? 'Create Sprint Task' : 'Create Task'}</>}
          </button>
        </div>
      </form>
    </main>
  );
}
