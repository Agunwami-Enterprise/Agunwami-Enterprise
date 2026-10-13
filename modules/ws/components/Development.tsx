'use client';

/**
 * Department workstation → Development (/ws/development): the team's sprint
 * board from AE Hub's sprint tasks, with progress and deadlines. Code
 * reviews, pull requests and deployments need a source-control connection
 * and say so.
 */

import { useEffect, useState } from 'react';
import { CalendarClock, Eye, GitPullRequest, Kanban, Rocket, Zap } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { isOverdue, setTaskStage, useDepartmentTeam, useStaffTasks, type WsTask } from '../data';
import { Card, Empty, ErrorNote, NotConnected, PageHeader, StatTile, fmtDate } from './ui';
import { TaskBoard, TaskDialog } from './task-board';

export default function Development() {
  const { user } = useAuth();
  const access = useWorkstationAccess();
  const { tasks, loading, error } = useStaffTasks();
  const { members } = useDepartmentTeam();
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState<WsTask | null>(null);
  const [scope, setScope] = useState<'sprint' | 'all'>('sprint');

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const every = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  const uid = user?.uid ?? '';
  const teamUids = new Set(members.map(m => m.uid));
  const teamTasks = tasks.filter(t => t.assigneeUids.some(id => teamUids.has(id)) || t.assigneeUids.includes(uid));
  const shown = scope === 'sprint' ? teamTasks.filter(t => t.isSprint) : teamTasks;
  const today = now ?? new Date(0);
  const done = shown.filter(t => t.stage === 'done').length;
  const pct = shown.length ? Math.round((done / shown.length) * 100) : null;
  const deadline = shown.filter(t => t.stage !== 'done' && t.due).map(t => t.due as Date).sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const daysLeft = deadline && now ? Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 86_400_000)) : null;
  const canMove = (t: WsTask) => t.assigneeUids.includes(uid) || t.createdByUid === uid || access.isDepartmentAdmin || access.kind === 'ceo';
  const me = { uid, name: user?.displayName || user?.email || 'Team member', email: user?.email || '' };

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Development" subtitle="The team's sprint board, code reviews and deployments" />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={scope === 'sprint' ? 'Sprint Progress' : 'Progress'} icon={Zap} iconClass="text-[#f59e0b]"
          value={loading ? '…' : pct === null ? '—' : `${pct}%`} sub={`${done} of ${shown.length} done`} />
        <StatTile label="In Review" icon={Eye} iconClass="text-[#2563eb]" value={loading ? '…' : String(shown.filter(t => t.stage === 'review').length)} sub="Submitted, waiting for approval" />
        <StatTile label="Overdue" icon={CalendarClock} iconClass="text-[#ef4444]" value={loading || !now ? '…' : String(shown.filter(t => isOverdue(t, today)).length)} sub="Past their due date" />
        <StatTile label="Deadline" icon={CalendarClock} iconClass="text-[#16a34a]" value={deadline ? fmtDate(deadline) : '—'}
          sub={daysLeft === null ? 'No open deadlines' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title={scope === 'sprint' ? 'Sprint Board' : 'Team Board'} icon={Kanban} action={
        <div role="radiogroup" aria-label="Board" className="flex rounded-lg bg-[#f0f0f0] p-0.5 dark:bg-white/8">
          {(['sprint', 'all'] as const).map(id => (
            <button key={id} role="radio" aria-checked={scope === id} onClick={() => setScope(id)}
              className={`rounded-md px-3 py-1 text-[13px] font-medium ${scope === id ? 'bg-white text-[#292929] shadow-sm dark:bg-[#2a2a2a] dark:text-white' : 'text-[#8a8a8a]'}`}>
              {id === 'sprint' ? 'Sprint tasks' : 'All team tasks'}
            </button>
          ))}
        </div>
      }>
        {loading || !now ? <Empty>Loading…</Empty> : shown.length === 0 ? (
          <Empty>{scope === 'sprint' ? 'No sprint tasks for the team yet. Sprints are planned and approved in AE Hub.' : 'No tasks for the team yet.'}</Empty>
        ) : <TaskBoard tasks={shown} now={today} onOpen={setOpen} />}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Code Reviews" icon={Eye} iconClass="text-[#2563eb]">
          <NotConnected source="GitHub" detail="Pull requests waiting for review, and who's reviewing them, will show here." />
        </Card>
        <Card title="Pull Requests" icon={GitPullRequest} iconClass="text-[#7c3aed]">
          <NotConnected source="GitHub" detail="Open, merged and changes-requested pull requests will show here." />
        </Card>
        <Card title="Deployments" icon={Rocket} iconClass="text-[#16a34a]">
          <NotConnected source="your hosting provider" detail="Production and staging deployments will show here." />
        </Card>
      </div>

      {open && (
        <TaskDialog task={open} canMove={canMove(open)} onClose={() => setOpen(null)} onMove={stage => setTaskStage(open.id, stage, me)} />
      )}
    </div>
  );
}
