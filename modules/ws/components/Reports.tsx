'use client';

/**
 * Department workstation → Reports (/ws/reports), from the design's report
 * types: My Report (your tasks, hours, attendance and leave for a period),
 * Sprint Report (the team's sprint: stages, overdue work and each person's
 * share) and, for the department admin, Team Report (each member's numbers).
 * Built from live AE Hub data; every report exports to CSV.
 */

import { useEffect, useState } from 'react';
import { BarChart3, CalendarCheck, CheckSquare, Clock3, Download, Timer, Users, Zap } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { monthId, subscribeMonthlySummary } from '@/modules/time-tracking/services';
import type { MonthlySummaryDoc } from '@/modules/time-tracking/types';
import { isOverdue, useDepartmentTeam, useStaffTasks, type WsTask } from '../data';
import { useLeaveFor, type WsLeave } from '../leave';
import { Card, Empty, PageHeader, Pill, StatTile, Tabs, btnGhost, downloadCsv, field, fmtDate } from './ui';
import { STAGE_COLUMNS } from './task-board';

type ReportType = 'mine' | 'sprint' | 'team';
type Period = 'month' | 'last-month' | 'quarter';

function periodRange(period: Period, now: Date): { start: Date; end: Date; months: string[]; label: string } {
  const y = now.getFullYear(), m = now.getMonth();
  if (period === 'last-month') {
    const start = new Date(y, m - 1, 1), end = new Date(y, m, 0, 23, 59, 59);
    return { start, end, months: [monthId(start)], label: start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  }
  if (period === 'quarter') {
    const start = new Date(y, m - 2, 1);
    return { start, end: now, months: [0, 1, 2].map(i => monthId(new Date(y, m - 2 + i, 1))), label: 'Last 3 months' };
  }
  return { start: new Date(y, m, 1), end: now, months: [monthId(now)], label: now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
}

/** Monthly summaries for several people and months, live. */
function useSummaries(uids: string[], months: string[]): Record<string, MonthlySummaryDoc | null> {
  const key = `${[...uids].sort().join(',')}|${months.join(',')}`;
  const [state, setState] = useState<{ key: string; data: Record<string, MonthlySummaryDoc | null> }>({ key: '', data: {} });
  useEffect(() => {
    const [u, ms] = key.split('|');
    const people = u ? u.split(',') : [];
    const list = ms ? ms.split(',') : [];
    const unsubscribes = people.flatMap(uid => list.map(month => subscribeMonthlySummary(uid, month, summary => {
      setState(prev => ({ key, data: { ...(prev.key === key ? prev.data : {}), [`${uid}|${month}`]: summary } }));
    })));
    return () => unsubscribes.forEach(un => un());
  }, [key]);
  return state.key === key ? state.data : {};
}

function hoursFor(uid: string, months: string[], data: Record<string, MonthlySummaryDoc | null>) {
  let hours = 0, days = 0, absent = 0;
  for (const month of months) {
    const s = data[`${uid}|${month}`];
    if (s) { hours += s.totalHoursWorked; days += s.daysPresent.length || s.totalDaysWorked; absent += s.daysAbsent.length; }
  }
  return { hours, days, absent };
}

function leaveDaysIn(leaves: WsLeave[], uid: string, start: Date, end: Date): number {
  const s = start.toLocaleDateString('en-CA'), e = end.toLocaleDateString('en-CA');
  return leaves.filter(l => l.userId === uid && l.status === 'approved' && l.endDate >= s && l.startDate <= e).reduce((n, l) => n + l.days, 0);
}

export default function Reports() {
  const { user } = useAuth();
  const access = useWorkstationAccess();
  const isAdmin = access.isDepartmentAdmin || access.kind === 'ceo';
  const uid = user?.uid ?? '';
  const { tasks, loading } = useStaffTasks();
  const { members } = useDepartmentTeam();
  const [type, setType] = useState<ReportType>('mine');
  const [period, setPeriod] = useState<Period>('month');
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    return () => clearTimeout(first);
  }, []);

  const today = now ?? new Date(0);
  const range = periodRange(period, today);
  const teamUids = [...new Set([uid, ...members.map(m => m.uid)].filter(Boolean))];
  const summaries = useSummaries(type === 'team' ? teamUids : uid ? [uid] : [], range.months);
  const leave = useLeaveFor(type === 'mine' ? (uid ? [uid] : []) : teamUids);

  const inRange = (d: Date | null) => !!d && d >= range.start && d <= range.end;
  const assignedTo = (t: WsTask, id: string) => t.assigneeUids.includes(id);
  const teamTasks = tasks.filter(t => t.assigneeUids.some(id => teamUids.includes(id)));

  function memberStats(id: string) {
    const theirs = tasks.filter(t => assignedTo(t, id));
    const done = theirs.filter(t => t.stage === 'done' && inRange(t.updated));
    const onTime = done.filter(t => !t.due || !t.updated || t.updated <= new Date(t.due.getFullYear(), t.due.getMonth(), t.due.getDate(), 23, 59, 59));
    const time = hoursFor(id, range.months, summaries);
    return {
      assigned: theirs.filter(t => inRange(t.created)).length,
      open: theirs.filter(t => t.stage !== 'done').length,
      completed: done.length,
      onTimePct: done.length ? Math.round((onTime.length / done.length) * 100) : null,
      overdue: theirs.filter(t => isOverdue(t, today)).length,
      ...time,
      leaveDays: leaveDaysIn(leave.requests, id, range.start, range.end),
    };
  }

  const me = memberStats(uid);
  const sprint = teamTasks.filter(t => t.isSprint);
  const sprintDone = sprint.filter(t => t.stage === 'done').length;
  const nameOf = (id: string) => members.find(m => m.uid === id)?.name ?? (id === uid ? (user?.displayName || 'You') : 'Team member');

  function exportReport() {
    const stamp = `${range.months[0]}${range.months.length > 1 ? `-to-${range.months[range.months.length - 1]}` : ''}`;
    if (type === 'mine') {
      downloadCsv(`my-report-${stamp}.csv`, ['Metric', 'Value'], [
        ['Period', range.label], ['Tasks assigned', me.assigned], ['Tasks completed', me.completed], ['Completed on time (%)', me.onTimePct ?? ''],
        ['Open tasks', me.open], ['Overdue', me.overdue], ['Hours worked', me.hours.toFixed(1)], ['Days present', me.days], ['Days absent', me.absent], ['Leave days', me.leaveDays],
      ]);
    } else if (type === 'sprint') {
      downloadCsv(`sprint-report-${stamp}.csv`, ['Task', 'Assignee', 'Stage', 'Priority', 'Due', 'Overdue'],
        sprint.map(t => [t.title, t.assigneeNames.join(', '), t.rawStage, t.priority, t.due ? t.due.toLocaleDateString('en-CA') : '', isOverdue(t, today) ? 'Yes' : 'No']));
    } else {
      downloadCsv(`team-report-${stamp}.csv`, ['Name', 'Assigned', 'Completed', 'On time (%)', 'Open', 'Overdue', 'Hours', 'Days present', 'Days absent', 'Leave days'],
        teamUids.map(id => { const s = memberStats(id); return [nameOf(id), s.assigned, s.completed, s.onTimePct ?? '', s.open, s.overdue, s.hours.toFixed(1), s.days, s.absent, s.leaveDays]; }));
    }
  }

  const types: Array<{ id: ReportType; label: string }> = [{ id: 'mine', label: 'My Report' }, { id: 'sprint', label: 'Sprint Report' }, ...(isAdmin ? [{ id: 'team' as const, label: 'Team Report' }] : [])];

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Reports" subtitle={`${range.label} · built from live AE Hub data`} actions={
        <>
          <select className={`${field} w-44`} value={period} onChange={e => setPeriod(e.target.value as Period)} aria-label="Period">
            <option value="month">This month</option>
            <option value="last-month">Last month</option>
            <option value="quarter">Last 3 months</option>
          </select>
          <button className={btnGhost} onClick={exportReport} disabled={loading || !now}><Download className="h-4 w-4" aria-hidden /> Export</button>
        </>
      } />

      <Tabs<ReportType> value={type} onChange={setType} tabs={types} />

      {type === 'mine' && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Tasks Completed" icon={CheckSquare} iconClass="text-[#16a34a]" value={loading ? '…' : String(me.completed)} sub={me.onTimePct === null ? 'None in this period' : `${me.onTimePct}% on time`} />
            <StatTile label="Open Tasks" icon={Clock3} iconClass="text-[#2563eb]" value={loading ? '…' : String(me.open)} sub={`${me.overdue} overdue now`} />
            <StatTile label="Hours Worked" icon={Timer} iconClass="text-[#f59e0b]" value={me.hours.toFixed(1)} sub={`${me.days} days present`} />
            <StatTile label="Leave Taken" icon={CalendarCheck} iconClass="text-[#7c3aed]" value={String(me.leaveDays)} sub={`${me.absent} days absent`} />
          </div>
          <Card title="My Tasks in This Period" icon={BarChart3}>
            {loading || !now ? <Empty>Loading…</Empty> : (() => {
              const list = tasks.filter(t => assignedTo(t, uid) && (inRange(t.created) || inRange(t.updated)));
              return list.length === 0 ? <Empty>No tasks in this period.</Empty> : (
                <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
                  {list.map(t => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="min-w-0 truncate text-[14px] text-[#292929] dark:text-gray-200">{t.title}</span>
                      <span className="flex shrink-0 items-center gap-2">
                        {t.due && <span className={`text-[12px] ${isOverdue(t, today) ? 'font-semibold text-[#dc2626]' : 'text-[#656565] dark:text-gray-400'}`}>{fmtDate(t.due)}</span>}
                        <Pill label={t.rawStage} tone={t.stage === 'done' ? 'green' : t.stage === 'review' ? 'amber' : t.stage === 'in-progress' ? 'blue' : 'gray'} />
                      </span>
                    </li>
                  ))}
                </ul>
              );
            })()}
          </Card>
        </>
      )}

      {type === 'sprint' && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Sprint Completion" icon={Zap} iconClass="text-[#f59e0b]" value={loading ? '…' : sprint.length ? `${Math.round((sprintDone / sprint.length) * 100)}%` : '—'} sub={`${sprintDone} of ${sprint.length} tasks`} />
            {STAGE_COLUMNS.slice(1).map(col => (
              <StatTile key={col.id} label={col.label} icon={CheckSquare} iconClass="text-[#525252] dark:text-gray-300" value={loading ? '…' : String(sprint.filter(t => t.stage === col.id).length)} sub="Sprint tasks" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="By Person" icon={Users}>
              {sprint.length === 0 ? <Empty>No sprint tasks for the team.</Empty> : (
                <ul className="space-y-3">
                  {teamUids.map(id => {
                    const theirs = sprint.filter(t => assignedTo(t, id));
                    if (theirs.length === 0) return null;
                    const done = theirs.filter(t => t.stage === 'done').length;
                    return (
                      <li key={id}>
                        <div className="mb-1 flex justify-between text-[14px]"><span className="text-[#292929] dark:text-gray-200">{nameOf(id)}</span><span className="text-[#656565] dark:text-gray-400">{done}/{theirs.length}</span></div>
                        <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10"><div className="h-full rounded-full bg-[#f5bd02]" style={{ width: `${Math.round((done / theirs.length) * 100)}%` }} /></div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
            <Card title="Overdue Sprint Tasks" icon={Clock3} iconClass="text-[#ef4444]">
              {(() => {
                const overdue = sprint.filter(t => isOverdue(t, today));
                return overdue.length === 0 ? <Empty>Nothing overdue in the sprint.</Empty> : (
                  <ul className="space-y-2">
                    {overdue.map(t => (
                      <li key={t.id} className="flex justify-between gap-3 text-[14px]">
                        <span className="min-w-0 truncate text-[#292929] dark:text-gray-200">{t.title} <span className="text-[#8a8a8a]">· {t.assigneeNames.join(', ') || 'Unassigned'}</span></span>
                        <span className="shrink-0 font-semibold text-[#dc2626]">{t.due ? fmtDate(t.due) : ''}</span>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </Card>
          </div>
        </>
      )}

      {type === 'team' && isAdmin && (
        <Card title="Team Report" icon={Users}>
          {loading || !now ? <Empty>Loading…</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[14px]">
                <thead className="text-[12px] uppercase tracking-wide text-[#8a8a8a]">
                  <tr>{['Name', 'Completed', 'On time', 'Open', 'Overdue', 'Hours', 'Present', 'Absent', 'Leave'].map(h => <th key={h} className="pb-2 pr-4 font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-[#e5e5e5] dark:divide-white/10">
                  {teamUids.map(id => {
                    const s = memberStats(id);
                    return (
                      <tr key={id} className="text-[#292929] dark:text-gray-200">
                        <td className="py-2.5 pr-4 font-medium">{nameOf(id)}</td>
                        <td className="pr-4">{s.completed}</td>
                        <td className="pr-4">{s.onTimePct === null ? '—' : `${s.onTimePct}%`}</td>
                        <td className="pr-4">{s.open}</td>
                        <td className={`pr-4 ${s.overdue ? 'font-semibold text-[#dc2626]' : ''}`}>{s.overdue}</td>
                        <td className="pr-4">{s.hours.toFixed(1)}</td>
                        <td className="pr-4">{s.days}</td>
                        <td className="pr-4">{s.absent}</td>
                        <td className="pr-4">{s.leaveDays}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
