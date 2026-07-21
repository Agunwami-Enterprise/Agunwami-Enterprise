'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeTasks } from '@/modules/tasks/services';
import { SkeletonTasks } from '@/components/Skeleton';

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TYPES
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

type Priority   = 'High' | 'Medium' | 'Low';
type TaskStatus = 'In Progress' | 'Pending' | 'Completed' | 'Overdue';
type TaskTab    = 'team' | 'assigned' | 'personal' | 'review';

interface Task {
  id: string; title: string; assignee: string;
  dueDate: string; status: TaskStatus; priority: Priority;
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   CONSTANTS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */


const ASSIGNEES = ['Alex Thompson','Emily Nwachukwu','Sarah Sunday','David L.','Michael Williams','Jessica Olumide'];

const STATUS_STYLE: Record<TaskStatus, { bg: string; text: string }> = {
  'In Progress': { bg:'#dcfce7', text:'#15803d' },
  'Pending':     { bg:'#fef3c7', text:'#92400e' },
  'Completed':   { bg:'#dbeafe', text:'#1e40af' },
  'Overdue':     { bg:'#fee2e2', text:'#dc2626' },
};

const PRIORITY_STYLE: Record<Priority, { bg: string; text: string }> = {
  'High':   { bg:'#fee2e2', text:'#dc2626' },
  'Medium': { bg:'#ede9fe', text:'#6d28d9' },
  'Low':    { bg:'#f7fee7', text:'#3f6212' },
};

const STAT_CARDS = [
  { label:'Total Tasks',  key:'total',      iconBg:'#dbeafe', iconColor:'#2563eb', icon:<TaskIcon /> },
  { label:'In Progress',  key:'inProgress', iconBg:'#d1fae5', iconColor:'#059669', icon:<ClockIcon /> },
  { label:'Completed',    key:'completed',  iconBg:'#dcfce7', iconColor:'#16a34a', icon:<CheckIcon /> },
  { label:'Pending',      key:'pending',    iconBg:'#fef3c7', iconColor:'#d97706', icon:<ClockIcon /> },
  { label:'Overdue',      key:'overdue',    iconBg:'#fee2e2', iconColor:'#dc2626', icon:<AlertIcon /> },
];

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MAIN PAGE
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

export default function TasksPage() {
  const [tab,          setTab]          = useState<TaskTab>('team');
  const [priorityF,    setPriorityF]    = useState('All Priority');
  const [statusF,      setStatusF]      = useState('All Status');
  const [empSearch,    setEmpSearch]    = useState('');
  const [addOpen,      setAddOpen]      = useState(false);
  const [detailTask,   setDetailTask]   = useState<Task | null>(null);
  const [MOCK_TASKS,   setMockTasks]    = useState<Task[]>([]);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => subscribeTasks((data) => { setMockTasks(data as Task[]); setLoading(false); }), []);

  const filtered = MOCK_TASKS.filter(t => {
    if (priorityF !== 'All Priority' && t.priority !== priorityF) return false;
    if (statusF   !== 'All Status'   && t.status   !== statusF as TaskStatus) return false;
    if (empSearch && !t.assignee.toLowerCase().includes(empSearch.toLowerCase()) && !t.title.toLowerCase().includes(empSearch.toLowerCase())) return false;
    return true;
  });

  const counts = {
    total:      MOCK_TASKS.length,
    inProgress: MOCK_TASKS.filter(t => t.status === 'In Progress').length,
    completed:  MOCK_TASKS.filter(t => t.status === 'Completed').length,
    pending:    MOCK_TASKS.filter(t => t.status === 'Pending').length,
    overdue:    MOCK_TASKS.filter(t => t.status === 'Overdue').length,
  };

  if (loading) return <SkeletonTasks />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Tasks &amp; Activities</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage your tasks, todos, and daily ceremonies</p>
          </div>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm hover:opacity-90"
            style={{ backgroundColor: '#f5bd02' }}
          >
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/>
            </svg>
            New Task
          </button>
        </div>

        {/* â”€â”€ Priority + Status filters (right-aligned) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-3 flex items-center justify-end gap-2">
          <FilterSelect
            value={priorityF} onChange={setPriorityF}
            options={['All Priority','High','Medium','Low']}
            icon={<FunnelIcon />}
          />
          <FilterSelect
            value={statusF} onChange={setStatusF}
            options={['All Status','In-Progress','Pending','Completed','Overdue']}
            icon={<FunnelIcon />}
          />
        </div>

        {/* â”€â”€ Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">
                  {counts[s.key as keyof typeof counts]}
                </p>
              </div>
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: s.iconBg, color: s.iconColor }}
              >
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* â”€â”€ Employee search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mb-0 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8">
            <circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/>
          </svg>
          <input
            type="text" value={empSearch} onChange={e => setEmpSearch(e.target.value)}
            placeholder="Search employee..."
            className="flex-1 bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
          />
        </div>

        {/* â”€â”€ Tab bar + table (dark panel in both modes) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="mt-3 overflow-hidden rounded-2xl" style={{ backgroundColor: '#1a1a1a' }}>
          {/* Tabs */}
          <div className="flex items-center gap-1 px-3 pt-3 pb-0">
            {([
              ['team',     'Team Task',          false],
              ['assigned', 'Assigned Tasks',     false],
              ['personal', 'Personal To-Do',     false],
              ['review',   'Review Submissions', true ],
            ] as const).map(([key, label, badge]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 rounded-t-lg px-3 py-2 text-[12px] font-medium transition-colors
                  ${tab === key
                    ? 'bg-[#f5bd02] text-[#1a1a1a]'
                    : 'text-gray-400 hover:text-white'}`}
              >
                {label}
                {badge && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">2</span>
                )}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr style={{ backgroundColor: '#1a1a1a' }}>
                  {['Task','Assignee','Due Date','Status','Priority','Actions'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 first:rounded-tl-none">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-[#1e1e1e]">
                {filtered.map((task, i) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    isLast={i === filtered.length - 1}
                    onView={() => setDetailTask(task)}
                  />
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[13px] text-gray-400">No tasks found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* â”€â”€ Modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {addOpen    && <AddTaskModal   onClose={() => setAddOpen(false)} />}
      {detailTask && <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />}
    </>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TASK ROW
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TaskRow({ task, isLast, onView }: { task: Task; isLast: boolean; onView: () => void }) {
  const ss = STATUS_STYLE[task.status];
  const ps = PRIORITY_STYLE[task.priority];

  return (
    <tr className={`transition-colors hover:bg-gray-50 dark:hover:bg-white/3 ${!isLast ? 'border-b border-gray-100 dark:border-white/5' : ''}`}>
      <td className="px-4 py-3 text-[13px] font-medium text-gray-800 dark:text-gray-200">{task.title}</td>
      <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-400">{task.assignee}</td>
      <td className="px-4 py-3 text-[12px] text-gray-600 dark:text-gray-400">{task.dueDate}</td>
      <td className="px-4 py-3">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: ss.bg, color: ss.text }}>
          {task.status}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: ps.bg, color: ps.text }}>
          {task.priority}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {/* View */}
          <button onClick={onView} className="flex h-7 w-7 items-center justify-center rounded-full text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/[0.1]" title="View details">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M1 8s3-6 7-6 7 6 7 6-3 6-7 6-7-6-7-6z"/><circle cx="8" cy="8" r="2.2"/></svg>
          </button>
          {/* Complete */}
          <button className="flex h-7 w-7 items-center justify-center rounded-full text-green-500 hover:bg-green-50 dark:hover:bg-green-500/[0.1]" title="Mark complete">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7,10 11,6" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          {/* Delete */}
          <button className="flex h-7 w-7 items-center justify-center rounded-full text-red-400 hover:bg-red-50 dark:hover:bg-red-500/[0.1]" title="Delete task">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="8" cy="8" r="6.5"/><line x1="5" y1="5" x2="11" y2="11" strokeLinecap="round"/><line x1="11" y1="5" x2="5" y2="11" strokeLinecap="round"/></svg>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADD TASK MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function AddTaskModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ title:'', assignee:'', dueDate:'', priority:'' });
  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 dark:border-white/6">
          <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Add New Task</h2>
          <CloseBtn onClose={onClose} />
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-gray-500 dark:text-gray-400">Task Title</label>
            <MInput value={form.title} onChange={set('title')} placeholder="" />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-gray-500 dark:text-gray-400">Assign To</label>
            <MSelect value={form.assignee} onChange={set('assignee')} placeholder="Select user..." options={ASSIGNEES} />
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-gray-500 dark:text-gray-400">Due Date</label>
            <div className="relative">
              <MInput value={form.dueDate} onChange={set('dueDate')} placeholder="mm/dd/yyyy" type="date" />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-gray-500 dark:text-gray-400">Priority</label>
            <MSelect value={form.priority} onChange={set('priority')} placeholder="Select" options={['High','Medium','Low']} />
          </div>
        </div>
        <div className="flex gap-3 border-t border-gray-100 px-6 py-4 dark:border-white/6">
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
            Cancel
          </button>
          <button className="flex-1 rounded-lg py-2.5 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
            Add Task
          </button>
        </div>
      </div>
    </Overlay>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   TASK DETAIL MODAL
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [msg, setMsg] = useState('');
  const ss = STATUS_STYLE[task.status];
  return (
    <Overlay onClose={onClose}>
      <div className="w-full max-w-[340px] rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/6">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Task Details</h2>
          <CloseBtn onClose={onClose} />
        </div>
        <div className="space-y-3 px-5 py-4">
          <Detail label="Staff Member" value={task.assignee} />
          <Detail label="Task"         value={task.title} />
          <Detail label="Date"         value={task.dueDate} />
          <div>
            <p className="mb-1 text-[11px] text-gray-500 dark:text-gray-400">Status</p>
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: ss.bg, color: ss.text }}>
              {task.status}
            </span>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] text-gray-500 dark:text-gray-400">Message to Staff Member</label>
            <textarea
              value={msg} onChange={e => setMsg(e.target.value)}
              placeholder="Type your message..."
              rows={4}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-[12px] text-gray-700 placeholder-gray-400 outline-none focus:border-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
            />
          </div>
          <button className="w-full rounded-lg py-2.5 text-[13px] font-semibold text-white hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
            Send Message
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 rounded-lg bg-green-500 py-2.5 text-[13px] font-semibold text-white hover:bg-green-600">
              Mark as Completed
            </button>
            <button onClick={onClose} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[13px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4">
              Close
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-[13px] font-medium text-gray-800 dark:text-gray-100">{value}</p>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FILTER SELECT
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function FilterSelect({ value, onChange, options, icon }: {
  value: string; onChange: (v: string) => void; options: string[]; icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex min-w-[130px] items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-300 dark:hover:bg-white/4"
      >
        {icon && <span className="text-gray-400">{icon}</span>}
        <span className="flex-1">{value}</span>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-gray-200 dark:bg-[#2a2a2a] dark:ring-white/8">
          {options.map(o => (
            <button
              key={o}
              onClick={() => { onChange(o); setOpen(false); }}
              className={`block w-full px-3 py-2 text-left text-[12px] hover:bg-gray-50 dark:hover:bg-white/5 ${value === o ? 'font-semibold text-gray-800 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SHARED HELPERS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function Overlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4"
      style={{ backgroundColor:'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </div>
  );
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button onClick={onClose} className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6">
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/>
      </svg>
    </button>
  );
}

function MInput({ value, onChange, placeholder, type = 'text' }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-[12px] text-gray-700 outline-none transition focus:border-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500"
    />
  );
}

function MSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder?: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 pr-8 text-[12px] text-gray-700 outline-none transition focus:border-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round">
        <polyline points="2,4 6,8 10,4"/>
      </svg>
    </div>
  );
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STAT ICONS
â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

function TaskIcon()  { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="1" width="12" height="14" rx="1.5"/><line x1="5" y1="5" x2="11" y2="5"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="11" x2="8" y2="11"/></svg>; }
function ClockIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="8" cy="8" r="6.5"/><polyline points="8,4.5 8,8 10.5,10" strokeLinecap="round"/></svg>; }
function CheckIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="8" cy="8" r="6.5"/><polyline points="5,8 7,10 11,6" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function AlertIcon() { return <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="8" cy="8" r="6.5"/><line x1="8" y1="5" x2="8" y2="8.5" strokeLinecap="round"/><circle cx="8" cy="11" r="0.8" fill="currentColor" stroke="none"/></svg>; }
function FunnelIcon() { return <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h12l-5 6v4l-2-1V9L2 3z"/></svg>; }

