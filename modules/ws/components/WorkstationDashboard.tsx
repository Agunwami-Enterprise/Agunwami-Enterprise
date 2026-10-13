'use client';

/**
 * Department workstation Overview (/ws/dashboard), from the AE Workstation
 * Figma design ("IT Lead Dashboard Screen"). Cards follow the department's
 * pages: development, technical-status and it-support add their cards. Cards
 * with a live source show real data; cards whose source isn't connected yet
 * (code reviews, deployments, incidents, support tickets, hosting) say what
 * will feed them.
 */

import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckSquare, Clock3, FolderOpen, GitPullRequest, GitPullRequestDraft,
  LifeBuoy, Rocket, Server, Users, Wrench, Zap, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { subscribeUserProfile, type UserProfile } from '@/modules/settings/services';
import { monthId, subscribeMonthlySummary } from '@/modules/time-tracking/services';
import type { MonthlySummaryDoc } from '@/modules/time-tracking/types';
import ClockWidget from '@/modules/time-tracking/components/ClockWidget';
import MonthlyCalendar from '@/modules/time-tracking/components/MonthlyCalendar';
import {
  isOverdue, useDepartmentTeam, useProjects, useStaffTasks,
  type ProjectSummary, type WsTask,
} from '../data';
import TaskDistributionChart from './TaskDistributionChart';
import { Card, Empty, NotConnected, StatTile, Tag, fmtDate } from './ui';

function TaskRow({ task, right, rightClass }: { task: WsTask; right: string; rightClass: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-[3.75px]">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        {task.tag && <Tag label={task.tag} />}
        <p className="min-w-0 text-[14px] leading-5 text-[#292929] dark:text-gray-200">{task.title}</p>
      </div>
      <p className={`shrink-0 text-[14px] font-medium leading-5 ${rightClass}`}>{right}</p>
    </div>
  );
}

function projectState(project: ProjectSummary): { label: string; className: string } {
  if (project.status === 'error' && !project.stale) return { label: 'Unreachable', className: 'bg-[#fee2e2] text-[#b91c1c]' };
  if (project.status !== 'online' || project.stale) return { label: 'Attention', className: 'bg-[#fef9c2] text-[#894b00]' };
  return { label: 'Good', className: 'bg-[#dcfce7] text-[#016630]' };
}


// ── Page ─────────────────────────────────────────────────────────────────────

export default function WorkstationDashboard() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [summary, setSummary] = useState<MonthlySummaryDoc | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const { tasks, loading: tasksLoading, error: tasksError } = useStaffTasks();
  const { members, loading: teamLoading, error: teamError } = useDepartmentTeam();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const access = useWorkstationAccess();
  const has = (pageId: string) => access.kind === 'ceo' || access.pages.includes(pageId);
  const hasDevelopment = has('development');
  const hasTechStatus = has('technical-status');
  const hasSupport = has('it-support');

  useEffect(() => (uid ? subscribeUserProfile(uid, setProfile) : undefined), [uid]);
  useEffect(() => (uid ? subscribeMonthlySummary(uid, monthId(), setSummary) : undefined), [uid]);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 1000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  const today = now ?? new Date(0);
  const myName = profile?.displayName || user?.displayName || '';
  const firstName = myName.split(' ')[0] || 'there';
  const hour = today.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Tasks: mine, and my department team's (assigned to someone in it).
  const teamUids = new Set(members.map(m => m.uid));
  const isMine = (t: WsTask) => t.assigneeUids.includes(uid) || (!!myName && t.assigneeNames.includes(myName));
  const myTasks = tasks.filter(isMine);
  const teamTasks = tasks.filter(t => t.assigneeUids.some(id => teamUids.has(id)) || isMine(t));
  const myOpen = myTasks.filter(t => t.stage !== 'done');
  const myOverdue = myOpen.filter(t => isOverdue(t, today));
  const teamOverdue = teamTasks.filter(t => isOverdue(t, today)).sort((a, b) => (a.due?.getTime() ?? 0) - (b.due?.getTime() ?? 0));

  const sprintTasks = teamTasks.filter(t => t.isSprint);
  const sprintDone = sprintTasks.filter(t => t.stage === 'done').length;
  const sprintPct = sprintTasks.length ? Math.round((sprintDone / sprintTasks.length) * 100) : null;
  const sprintDeadline = sprintTasks.filter(t => t.stage !== 'done' && t.due).map(t => t.due as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
  const daysLeft = sprintDeadline ? Math.max(0, Math.ceil((sprintDeadline.getTime() - today.getTime()) / 86_400_000)) : null;

  const pipeline = [
    { label: 'In Progress', value: teamTasks.filter(t => t.stage === 'in-progress').length },
    { label: 'In Review', value: teamTasks.filter(t => t.stage === 'review').length },
    { label: 'Overdue', value: teamOverdue.length },
    { label: 'Completed', value: teamTasks.filter(t => t.stage === 'done').length },
  ];

  const online = members.filter(m => m.online).length;
  const activeProjects = projects.length;
  const reachable = projects.filter(p => p.status === 'online' && !p.stale).length;

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      {/* Greeting */}
      <div className="flex flex-col justify-between gap-3 rounded-lg bg-[#f5bd02] p-6 text-[#1a1a1a] sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[24px] font-semibold leading-8">{greeting}, {firstName}</h1>
          <p className="text-[16px] leading-6">{access.kind === 'ceo' ? 'Department workstation preview' : `${access.departmentName} Workstation`}</p>
        </div>
        <div className="sm:text-right" aria-live="off">
          <p className="text-[24px] font-semibold leading-6 tabular-nums">
            {now ? now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' }) : ' '}
          </p>
          <p className="mt-1 text-[16px] leading-6">
            {now ? now.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : ' '}
          </p>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <StatTile label="Assigned to Me" icon={CheckSquare} iconClass="text-[#f59e0b]"
          value={tasksLoading ? '…' : String(myOpen.length)}
          sub={tasksError ? tasksError : `${myOverdue.length} overdue`} />
        <StatTile label="Active Projects" icon={FolderOpen} iconClass="text-[#16a34a]"
          value={projectsLoading ? '…' : String(activeProjects)}
          sub={projectsError ? projectsError : projects.map(p => p.name).join(', ') || 'No projects added yet'} />
        <StatTile label="Team Online" icon={Users} iconClass="text-[#f87171]"
          value={teamLoading ? '…' : `${online}/${members.length}`}
          sub={teamLoading ? 'Loading team…' : teamError || `${members.length - online} away`} />
        <StatTile label="Sprint Progress" icon={Zap} iconClass="text-[#f59e0b]"
          value={sprintPct === null ? '—' : `${sprintPct}%`} muted={sprintPct === null}
          sub={sprintPct === null ? 'No sprint tasks for the team' : `${sprintDone} of ${sprintTasks.length} sprint tasks done${daysLeft !== null ? ` · ${daysLeft} days left` : ''}`} />
        {hasSupport && <StatTile label="Support Tickets" icon={LifeBuoy} iconClass="text-[#2563eb]" value="—" sub="Not connected yet" muted />}
        {hasTechStatus && <StatTile label="Active Incidents" icon={AlertTriangle} iconClass="text-[#ef4444]" value="—" sub="Not connected yet" muted />}
        {hasDevelopment && <StatTile label="Code Reviews" icon={GitPullRequest} iconClass="text-[#7c3aed]" value="—" sub="Not connected yet" muted />}
        {hasTechStatus && (
          <StatTile label="System Health" icon={Activity} iconClass="text-[#16a34a]"
            value={projectsLoading || !activeProjects ? '—' : `${reachable}/${activeProjects}`} muted={!activeProjects}
            sub={activeProjects ? 'Project endpoints reporting normally' : 'Uptime monitoring not connected yet'} />
        )}
      </div>

      {/* Time tracking & attendance (shared with the rest of the workstation) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ClockWidget />
        {uid && <MonthlyCalendar uid={uid} summary={summary} />}
      </div>

      {/* Tasks & delivery */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-[14px]">
          <Card title="Overdue Tasks" icon={Clock3} iconClass="text-[#ef4444]">
            {tasksLoading ? <Empty>Loading…</Empty> : teamOverdue.length === 0 ? <Empty>Nothing overdue for the team.</Empty> : (
              teamOverdue.slice(0, 5).map(task => (
                <TaskRow key={task.id} task={task} right={task.due ? fmtDate(task.due) : ''} rightClass="text-[#fb2c36]" />
              ))
            )}
          </Card>
          {hasDevelopment && (
          <Card title="Pending Reviews" icon={GitPullRequest} iconClass="text-[#2563eb]">
            <NotConnected source="GitHub" detail="Pull requests waiting for your review will show here." />
          </Card>
          )}
          {hasDevelopment && (
          <Card title="Changes Requested" icon={GitPullRequestDraft} iconClass="text-[#f59e0b]">
            <NotConnected source="GitHub" detail="Pull requests with requested changes will show here." />
          </Card>
          )}
          <Card title="Current Sprint" icon={Zap}>
            {sprintPct === null ? <Empty>No sprint tasks are assigned to the team yet.</Empty> : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[14px] font-medium text-[#292929] dark:text-gray-200">{sprintTasks.length} sprint tasks</p>
                  {sprintDeadline && <p className="text-[14px] text-[#656565] dark:text-gray-400">Deadline: {fmtDate(sprintDeadline)}</p>}
                </div>
                <div className="mt-1 h-[7.5px] overflow-hidden rounded-full bg-[#d4a627]/20" role="progressbar" aria-valuenow={sprintPct} aria-valuemin={0} aria-valuemax={100} aria-label="Sprint progress">
                  <div className="h-full rounded-full bg-[#d4a627] transition-[width] duration-500" style={{ width: `${sprintPct}%` }} />
                </div>
                <p className="pt-2 text-[14px] text-[#656565] dark:text-gray-400">
                  {sprintPct}% complete{daysLeft !== null ? ` · ${daysLeft} days remaining` : ''}
                </p>
              </>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-[14px]">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {pipeline.map(item => (
              <div key={item.label} className="rounded-lg bg-[#fafafa] px-3 py-4 text-center drop-shadow-[0px_4px_2px_rgba(0,0,0,0.16)] dark:bg-[#1e1e1e]">
                <p className="text-[20px] font-semibold leading-7 text-black dark:text-white">{tasksLoading ? '…' : item.value}</p>
                <p className="text-[12px] text-[#656565] dark:text-gray-400">{item.label}</p>
              </div>
            ))}
          </div>
          {hasDevelopment && (
          <Card title="Recent Deployments" icon={Rocket} iconClass="text-[#7c3aed]">
            <NotConnected source="your hosting provider" detail="Deployments to production and staging will show here." />
          </Card>
          )}
          <Card title="Active Projects" icon={FolderOpen} iconClass="text-[#16a34a]">
            {projectsLoading ? <Empty>Loading…</Empty> : projectsError ? <Empty>{projectsError}</Empty> : projects.length === 0 ? (
              <Empty>No projects have been added yet.</Empty>
            ) : projects.map(project => {
              const state = projectState(project);
              return (
                <div key={project.id} className="flex items-center justify-between gap-3 py-[3.75px]">
                  <div className="flex min-w-0 items-center gap-2">
                    <Tag label={project.name} />
                    <span className="truncate text-[14px] text-[#656565] dark:text-gray-400">
                      {project.tasks ? `${project.tasks.total} tasks` : 'No task data'}
                    </span>
                  </div>
                  <span className={`shrink-0 rounded px-1.5 py-0.5 text-[13px] font-medium ${state.className}`}>{state.label}</span>
                </div>
              );
            })}
          </Card>
        </div>
      </div>

      {/* Operations & support */}
      {(hasTechStatus || hasSupport) && (
      <div className={`grid grid-cols-1 items-start gap-6 ${hasTechStatus && hasSupport ? 'lg:grid-cols-2' : ''}`}>
        {hasTechStatus && (
        <Card title="Tech Ops" icon={Server} iconClass="text-[#525252] dark:text-gray-300">
          <p className="text-[14px] font-medium text-[#525252] dark:text-gray-300">Website Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {projects.length === 0 ? <Empty>{projectsLoading ? 'Loading…' : 'No projects to monitor yet.'}</Empty> : projects.map(project => {
              const state = projectState(project);
              const dot = state.label === 'Good' ? 'bg-[#16a34a]' : state.label === 'Attention' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]';
              return (
                <span key={project.id} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${state.className}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} aria-hidden />
                  {project.name} — {state.label === 'Good' ? 'Operational' : state.label}
                </span>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-[#656565] dark:text-gray-400">From each project’s metrics endpoint.</p>
          <div className="mt-4 space-y-3">
            {[
              { title: 'Hosting Alerts', detail: 'Renewals and hosting warnings will show here.', source: 'your hosting provider' },
              { title: 'Integration Errors', detail: 'Failing webhooks and third-party integrations will show here.', source: 'error monitoring' },
              { title: 'Active Incidents', detail: 'Open incidents and outages will show here.', source: 'an incident tracker' },
            ].map(row => (
              <div key={row.title}>
                <p className="mb-1.5 text-[14px] font-medium text-[#525252] dark:text-gray-300">{row.title}</p>
                <NotConnected source={row.source} detail={row.detail} />
              </div>
            ))}
          </div>
        </Card>
        )}
        {hasSupport && (
        <Card title="IT Support" icon={Wrench} iconClass="text-[#2563eb]">
          <NotConnected source="a support-ticket system" detail="Open, high-priority, unassigned and resolved tickets from other departments will show here." />
        </Card>
        )}
      </div>
      )}

      {/* Charts */}
      <div className={`grid grid-cols-1 items-start gap-6 ${hasSupport ? 'lg:grid-cols-2' : ''}`}>
        <Card title="Team Task Distribution" icon={BarChart3} iconClass="text-[#525252] dark:text-gray-300">
          {tasksLoading || !now ? <Empty>Loading…</Empty> : <TaskDistributionChart tasks={teamTasks} now={now} />}
        </Card>
        {hasSupport && (
          <Card title="Support Ticket Volume" icon={LifeBuoy} iconClass="text-[#2563eb]">
            <NotConnected source="a support-ticket system" detail="Monthly ticket volume will show here." />
          </Card>
        )}
      </div>
    </div>
  );
}
