'use client';

/**
 * Today's attendance reported by each project's metrics endpoint: totals,
 * hours per project, and every staff member labelled with their project.
 */

import { useState } from 'react';
import {
  ALL_SOURCES, FeedNotices, SourceBadge, SourceFilter, useFeed,
} from '@/app/components/ceo/feed';
import type { TimeTrackingFeed } from '@/backend/modules/time-tracking/time-tracking.feed';
import type { ProjectAttendanceStatus } from '@/backend/modules/projects/projects.types';

const STATUS_STYLE: Record<ProjectAttendanceStatus, { bg: string; text: string }> = {
  'Clocked in':     { bg: '#dcfce7', text: '#166534' },
  'Clocked out':    { bg: '#dbeafe', text: '#1e40af' },
  'On leave':       { bg: '#fef3c7', text: '#92400e' },
  'Not clocked in': { bg: '#f3f4f6', text: '#4b5563' },
};
const ALL_STATUSES = 'All statuses';

const time = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '-';

export default function ProjectAttendance() {
  const feed = useFeed<TimeTrackingFeed>('/api/ceo/time-tracking');
  const [sourceF, setSourceF] = useState(ALL_SOURCES);
  const [statusF, setStatusF] = useState(ALL_STATUSES);

  if (feed.loading) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]" aria-label="Loading project attendance" />;
  }
  if (!feed.data) {
    return (
      <div className="rounded-2xl bg-white p-5 text-[12px] text-red-600 shadow-sm dark:bg-[#1e1e1e] dark:text-red-400">
        Project attendance could not be loaded: {feed.error}{' '}
        <button type="button" className="font-semibold underline" onClick={() => void feed.reload()}>Try again</button>
      </div>
    );
  }

  const projects = feed.data.attendance.filter(p => sourceF === ALL_SOURCES || p.source.id === sourceF);
  const staff = projects
    .flatMap(project => project.staff.map(member => ({ ...member, source: project.source })))
    .filter(member => statusF === ALL_STATUSES || member.status === statusF);
  const sum = (key: 'activeStaff' | 'clockedIn' | 'onLeave' | 'notClockedIn' | 'hoursToday') =>
    projects.reduce((total, project) => total + project[key], 0);
  const totalHours = Math.round(sum('hoursToday') * 10) / 10;

  const stats = [
    { label: 'Clocked in now', value: `${sum('clockedIn')}`, sub: `of ${sum('activeStaff')} active staff` },
    { label: 'Hours worked today', value: `${totalHours}h`, sub: 'All sessions, including open ones' },
    { label: 'On leave today', value: `${sum('onLeave')}`, sub: 'Approved leave' },
    { label: 'Not clocked in', value: `${sum('notClockedIn')}`, sub: 'No session today' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <FeedNotices projects={feed.data.projects} section="attendance" />

      {feed.data.attendance.length === 0 ? (
        <div className="rounded-2xl bg-white p-5 text-[12px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
          No project reports attendance yet. Projects appear here once their metrics endpoint sends a <code>timeTracking</code> section.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Project attendance today</h2>
            <div className="flex flex-wrap gap-2">
              <SourceFilter sources={feed.data.attendance.map(p => p.source)} value={sourceF} onChange={setSourceF} />
              <select
                value={statusF}
                onChange={e => setStatusF(e.target.value)}
                aria-label="Filter by status"
                className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200"
              >
                {[ALL_STATUSES, ...Object.keys(STATUS_STYLE)].map(option => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>

          <div className="ae-stagger grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">{stat.value}</p>
                <p className="text-[10px] text-gray-400">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* Hours per project */}
          <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <h3 className="mb-4 text-[13px] font-bold text-gray-800 dark:text-white">Hours today by project</h3>
            <div className="flex flex-col gap-3">
              {projects.map(project => {
                const share = totalHours > 0 ? Math.round((project.hoursToday / totalHours) * 100) : 0;
                return (
                  <div key={project.source.id}>
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-[12px]">
                      <SourceBadge source={project.source} />
                      <span className="text-gray-500 dark:text-gray-400">
                        {project.hoursToday}h · {project.clockedIn} of {project.activeStaff} clocked in{totalHours > 0 ? ` · ${share}%` : ''}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10">
                      <div className="h-2 rounded-full" style={{ width: `${share}%`, backgroundColor: project.source.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Staff */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/6">
                    {['Staff', 'Project', 'Department', 'Status', 'Clock in', 'Clock out', 'Hours'].map(head => (
                      <th key={head} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staff.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-[13px] text-gray-400">No staff match these filters.</td></tr>
                  ) : staff.map(member => {
                    const style = STATUS_STYLE[member.status];
                    return (
                      <tr key={`${member.source.id}:${member.id}`} className="border-b border-gray-50 last:border-0 dark:border-white/4">
                        <td className="px-4 py-3 text-[13px] font-medium text-gray-700 dark:text-gray-200">{member.name}</td>
                        <td className="px-4 py-3"><SourceBadge source={member.source} /></td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 dark:text-gray-400">{member.department ?? '-'}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-sm px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor: style.bg, color: style.text }}>{member.status.toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 dark:text-gray-400">{time(member.clockIn)}</td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 dark:text-gray-400">{time(member.clockOut)}</td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-gray-700 dark:text-gray-200">{member.hoursToday}h</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
