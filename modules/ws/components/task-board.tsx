'use client';

/**
 * Task board, list and details for the department workstation (Tasks and
 * Development pages). Tasks are AE Hub's staffTasks; moving one writes AE
 * Hub's own stage, so it shows the same in AE Hub.
 */

import { useState } from 'react';
import AeModal from '@/app/components/common/AeModal';
import { AEHUB_STAGES, isOverdue, type TaskStage, type WsTask } from '../data';
import { Empty, Pill, Tag, btnGhost, btnPrimary, field, fmtDate } from './ui';

export const STAGE_COLUMNS: Array<{ id: TaskStage; label: string; dot: string }> = [
  { id: 'todo', label: 'To Do', dot: 'bg-[#a3a3a3]' },
  { id: 'in-progress', label: 'In Progress', dot: 'bg-[#2563eb]' },
  { id: 'review', label: 'In Review', dot: 'bg-[#f5bd02]' },
  { id: 'done', label: 'Done', dot: 'bg-[#16a34a]' },
];

const PRIORITY_TONE: Record<string, 'gray' | 'blue' | 'amber' | 'red'> = { Low: 'gray', Medium: 'blue', High: 'amber', Critical: 'red' };

function TaskCard({ task, now, onOpen }: { task: WsTask; now: Date; onOpen: () => void }) {
  const overdue = isOverdue(task, now);
  return (
    <button onClick={onOpen} className="w-full rounded-lg border border-[#e5e5e5] bg-white p-3 text-left transition-shadow hover:shadow-md dark:border-white/10 dark:bg-[#232323]">
      <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
        {task.tag && <Tag label={task.tag} />}
        <Pill label={task.priority} tone={PRIORITY_TONE[task.priority] ?? 'gray'} />
        {task.isSprint && <Pill label="Sprint" tone="purple" />}
      </div>
      <p className="text-[14px] font-medium leading-5 text-[#292929] dark:text-gray-100">{task.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2 text-[12px] text-[#656565] dark:text-gray-400">
        <span className="truncate">{task.assigneeNames.join(', ') || 'Unassigned'}</span>
        {task.due && <span className={`shrink-0 ${overdue ? 'font-semibold text-[#dc2626]' : ''}`}>{overdue ? 'Overdue · ' : ''}{fmtDate(task.due)}</span>}
      </div>
    </button>
  );
}

export function TaskBoard({ tasks, now, onOpen }: { tasks: WsTask[]; now: Date; onOpen: (task: WsTask) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {STAGE_COLUMNS.map(column => {
        const items = tasks.filter(t => t.stage === column.id);
        return (
          <div key={column.id} className="rounded-lg bg-[#f0f0f0] p-3 dark:bg-white/[0.04]">
            <p className="mb-3 flex items-center gap-2 text-[13px] font-semibold text-[#525252] dark:text-gray-300">
              <span className={`h-2 w-2 rounded-full ${column.dot}`} />{column.label}<span className="font-normal text-[#8a8a8a]">{items.length}</span>
            </p>
            <div className="space-y-2">
              {items.length === 0 ? <p className="py-4 text-center text-[12px] text-[#a3a3a3]">Nothing here</p>
                : items.map(task => <TaskCard key={task.id} task={task} now={now} onOpen={() => onOpen(task)} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TaskList({ tasks, now, onOpen }: { tasks: WsTask[]; now: Date; onOpen: (task: WsTask) => void }) {
  if (tasks.length === 0) return <Empty>No tasks here.</Empty>;
  return (
    <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
      {tasks.map(task => {
        const overdue = isOverdue(task, now);
        const column = STAGE_COLUMNS.find(c => c.id === task.stage)!;
        return (
          <li key={task.id}>
            <button onClick={() => onOpen(task)} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${column.dot}`} aria-label={column.label} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[#292929] dark:text-gray-100">{task.title}</p>
                  <p className="truncate text-[12px] text-[#656565] dark:text-gray-400">{task.rawStage} · {task.assigneeNames.join(', ') || 'Unassigned'}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2 pl-4 sm:pl-0">
                <Pill label={task.priority} tone={PRIORITY_TONE[task.priority] ?? 'gray'} />
                {task.due && <span className={`text-[12px] ${overdue ? 'font-semibold text-[#dc2626]' : 'text-[#656565] dark:text-gray-400'}`}>{fmtDate(task.due)}</span>}
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function Overlay({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer?: React.ReactNode }) {
  return <AeModal title={title} onClose={onClose} footer={footer}>{children}</AeModal>;
}

/** A task's details; `canMove` lets the assignee, creator or department admin change its stage. */
export function TaskDialog({ task, canMove, onClose, onMove }: {
  task: WsTask; canMove: boolean; onClose: () => void; onMove: (stage: string) => Promise<void>;
}) {
  const [stage, setStage] = useState(task.rawStage);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const stages = AEHUB_STAGES.includes(task.rawStage as typeof AEHUB_STAGES[number]) ? [...AEHUB_STAGES] : [task.rawStage, ...AEHUB_STAGES];

  return (
    <Overlay title={task.title} onClose={onClose} footer={canMove && task.editable ? (
      <>
        <button className={btnGhost} onClick={onClose}>Close</button>
        <button className={btnPrimary} disabled={saving || stage === task.rawStage} onClick={async () => {
          setSaving(true);
          setError('');
          try { await onMove(stage); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'The task could not be updated.'); setSaving(false); }
        }}>{saving ? 'Saving…' : 'Save stage'}</button>
      </>
    ) : undefined}>
      <div className="flex flex-wrap gap-1.5">
        {task.tag && <Tag label={task.tag} />}
        <Pill label={task.priority} tone={PRIORITY_TONE[task.priority] ?? 'gray'} />
        {task.isSprint && <Pill label="Sprint" tone="purple" />}
        <Pill label={task.rawStage} tone="gray" />
      </div>
      {task.description && <p className="whitespace-pre-wrap text-[14px] leading-6 text-[#292929] dark:text-gray-200">{task.description}</p>}
      <dl className="grid grid-cols-2 gap-2 text-[13px]">
        <div><dt className="text-[#8a8a8a]">Assigned to</dt><dd className="text-[#292929] dark:text-gray-200">{task.assigneeNames.join(', ') || 'Unassigned'}</dd></div>
        <div><dt className="text-[#8a8a8a]">Created by</dt><dd className="text-[#292929] dark:text-gray-200">{task.createdByName || '—'}</dd></div>
        <div><dt className="text-[#8a8a8a]">Start</dt><dd className="text-[#292929] dark:text-gray-200">{task.start ? fmtDate(task.start) : '—'}</dd></div>
        <div><dt className="text-[#8a8a8a]">Due</dt><dd className="text-[#292929] dark:text-gray-200">{task.due ? fmtDate(task.due) : '—'}</dd></div>
      </dl>
      {canMove && task.editable ? (
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Stage</span>
          <select className={field} value={stage} onChange={e => setStage(e.target.value)}>
            {stages.map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="mt-1 block text-[12px] text-[#8a8a8a]">Saved to AE Hub too.</span>
        </label>
      ) : (
        <p className="text-[12px] text-[#8a8a8a]">{task.editable ? 'Only the assignee, the creator or the department admin can move this task.' : 'This task came from a chat and is managed there.'}</p>
      )}
      {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}
