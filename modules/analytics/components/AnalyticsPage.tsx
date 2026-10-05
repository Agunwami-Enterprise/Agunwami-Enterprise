'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { SkeletonAnalytics } from '@/app/components/ceo/Skeleton';
import type { CeoAnalyticsPayload } from '@/backend/modules/analytics/analytics.types';

type ReportTab = 'staff' | 'financial' | 'tasks' | 'development' | 'records';

const TABS: { key: ReportTab; label: string }[] = [
  { key: 'staff', label: 'Staff Performance' },
  { key: 'financial', label: 'Financial' },
  { key: 'tasks', label: 'Task Metrics' },
  { key: 'development', label: 'Staff Development' },
  { key: 'records', label: 'Time Records' },
];

const COLOR_BY_STATUS: Record<string, string> = {
  Todo: '#9ca3af',
  'In Progress': '#3b82f6',
  'In Review': '#f5bd02',
  Completed: '#22c55e',
  Overdue: '#ef4444',
};

const COLOR_BY_PRIORITY: Record<string, string> = {
  High: '#ef4444',
  Medium: '#8b5cf6',
  Low: '#84cc16',
};

export default function AnalyticsPage() {
  const [reportTab, setReportTab] = useState<ReportTab>('staff');
  const [projectId, setProjectId] = useState('all');
  const [department, setDepartment] = useState('All Departments');
  const [analytics, setAnalytics] = useState<CeoAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshId, setRefreshId] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ project: projectId, department });

    fetch(`/api/ceo/analytics?${params.toString()}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => null);
          throw new Error(result?.error || `Analytics request failed (${response.status}).`);
        }
        return response.json() as Promise<CeoAnalyticsPayload>;
      })
      .then((result) => {
        if (!controller.signal.aborted) {
          setAnalytics(result);
          setError(null);
        }
      })
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : 'Could not load analytics.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [projectId, department, refreshId]);

  if (loading && !analytics) return <SkeletonAnalytics />;

  const handleProjectChange = (value: string) => {
    setLoading(true);
    setError(null);
    setDepartment('All Departments');
    setProjectId(value);
  };

  const handleDepartmentChange = (value: string) => {
    setLoading(true);
    setError(null);
    setDepartment(value);
  };

  const refresh = () => {
    setLoading(true);
    setError(null);
    setRefreshId((value) => value + 1);
  };
  const maxRevenue = Math.max(0, ...(analytics?.monthlyFinance || []).map((item) => item.revenue));

  const taskStatusRows = (analytics?.tasksByStatus || []).map((item) => ({
    label: item.label,
    pct: item.pct,
    sub: `${item.count}`,
    color: COLOR_BY_STATUS[item.label] || item.color,
  }));
  const taskPriorityRows = (analytics?.tasksByPriority || []).map((item) => ({
    label: item.label,
    pct: item.pct,
    sub: `${item.count}`,
    color: COLOR_BY_PRIORITY[item.label] || item.color,
  }));

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Analytics &amp; Reports</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            Live analytics from configured project endpoints
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/8 dark:text-gray-300 dark:hover:bg-white/4"
        >
          <RefreshIcon /> {loading ? 'Refreshing…' : 'Refresh Data'}
        </button>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 dark:bg-[#1e1e1e]">
        <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          Project
          <select
            value={projectId}
            onChange={(event) => handleProjectChange(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
          >
            {(analytics?.projects || [{ id: 'all', name: 'All Projects' }]).map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">
          Department
          <select
            value={department}
            onChange={(event) => handleDepartmentChange(event.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
          >
            <option>All Departments</option>
            {(analytics?.departments || []).map((name) => <option key={name}>{name}</option>)}
          </select>
        </label>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[12px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}
      {loading && analytics && (
        <p role="status" className="mb-4 text-[11px] text-gray-500 dark:text-gray-400">Refreshing project analytics…</p>
      )}

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {analytics && [
          { label: 'Total Revenue', value: analytics.kpis.totalRevenue, sub: analytics.kpis.totalRevenueSub },
          { label: 'All Staff', value: analytics.kpis.totalStaff, sub: analytics.kpis.totalStaffSub },
          { label: 'Tasks Completed', value: analytics.kpis.tasksCompleted, sub: analytics.kpis.tasksCompletedSub },
          { label: 'Avg. Performance', value: analytics.kpis.avgPerformance, sub: analytics.kpis.avgPerformanceSub },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{metric.label}</p>
            <p className="mt-0.5 text-[20px] font-bold text-gray-800 dark:text-white">{metric.value}</p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{metric.sub}</p>
          </div>
        ))}
      </div>

      <div className="mb-5 flex overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setReportTab(tab.key)}
            className={`flex-shrink-0 rounded-lg px-4 py-2 text-[12px] font-semibold transition-colors ${
              reportTab === tab.key
                ? 'bg-[#f5bd02] text-[#1a1a1a]'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!analytics && !error && <EmptyState message="No analytics data is available." />}
      {analytics && reportTab === 'staff' && (
        <div className="space-y-5">
          <Panel title="Recent Project Activity">
            {analytics.activityLog.length ? (
              <div className="divide-y divide-gray-100 dark:divide-white/6">
                {analytics.activityLog.map((activity, index) => (
                  <div key={`${activity.name}-${activity.time}-${index}`} className="flex items-start justify-between gap-4 py-3">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{activity.name}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{activity.action}: {activity.detail}</p>
                    </div>
                    <time className="shrink-0 text-[10px] text-gray-400">{activity.time}</time>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="No activity data was returned by this project." />}
          </Panel>
          <Panel title={`Project Staff (${analytics.staffDirectory.length})`}>
            {analytics.staffDirectory.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-[11px]">
                  <thead className="text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Staff Member</th>
                      <th className="pb-2 pr-4 font-medium">Project</th>
                      <th className="pb-2 pr-4 font-medium">Department</th>
                      <th className="pb-2 font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/6">
                    {analytics.staffDirectory.map((staff) => (
                      <tr key={`${staff.project}:${staff.id}`}>
                        <td className="py-2 pr-4 font-medium text-gray-800 dark:text-white">{staff.name}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{staff.project}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{staff.department || '—'}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">{staff.role || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="No staff records were returned by the selected project endpoint." />}
          </Panel>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="Individual Performance">
              {analytics.staffPerf.length ? (
                <BarList rows={analytics.staffPerf.map((staff) => ({
                  label: staff.name,
                  pct: staff.productivity,
                  sub: `${staff.productivity}%`,
                  color: '#22c55e',
                }))} />
              ) : <EmptyState message="No staff performance data was returned by this project." />}
            </Panel>
            <Panel title="Department Task Completion">
              {analytics.deptCompletion.length ? (
                <BarList rows={analytics.deptCompletion.map((department) => ({
                  ...department,
                  color: '#3b82f6',
                }))} />
              ) : <EmptyState message="No department task records are available." />}
            </Panel>
          </div>
          <Panel title="Detailed Performance Metrics">
            {analytics.perfMetrics.length ? (
              <div className="divide-y divide-gray-100 dark:divide-white/6">
                {analytics.perfMetrics.map((staff) => (
                  <div key={`${staff.name}-${staff.department || ''}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{staff.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400">
                        {[staff.department, `${staff.tasks} tasks`, `${staff.attendance}% attendance`, staff.rating]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <span className="text-[14px] font-bold text-green-600">{staff.productivity}%</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="No detailed staff metrics were returned by this project." />}
          </Panel>
        </div>
      )}

      {analytics && reportTab === 'financial' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="Monthly Finance">
            {analytics.monthlyFinance.length ? (
              <BarList rows={analytics.monthlyFinance.map((month) => ({
                label: month.month,
                pct: maxRevenue ? Math.round((month.revenue / maxRevenue) * 100) : 0,
                sub: `Revenue ${month.revenue.toLocaleString()} · Expenses ${month.expenses.toLocaleString()}`,
                color: '#22c55e',
              }))} />
            ) : <EmptyState message="No monthly financial data was returned by this project." />}
          </Panel>
          <Panel title="Expense Breakdown">
            {analytics.expenseBreakdown.length
              ? <BarList rows={analytics.expenseBreakdown.map((item) => ({ ...item }))} />
              : <EmptyState message="No expense breakdown data was returned by this project." />}
          </Panel>
        </div>
      )}

      {analytics && reportTab === 'tasks' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="Tasks by Status">
              {taskStatusRows.length ? <BarList rows={taskStatusRows} /> : <EmptyState message="No task status data is available." />}
            </Panel>
            <Panel title="Tasks by Priority">
              {taskPriorityRows.length ? <BarList rows={taskPriorityRows} /> : <EmptyState message="No task priority data is available." />}
            </Panel>
          </div>
          <Panel title={`Project Tasks (${analytics.taskItems.length})`}>
            {analytics.taskItems.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-[11px]">
                  <thead className="text-gray-500 dark:text-gray-400">
                    <tr>
                      <th className="pb-2 pr-4 font-medium">Task</th>
                      <th className="pb-2 pr-4 font-medium">Department</th>
                      <th className="pb-2 pr-4 font-medium">Assignee</th>
                      <th className="pb-2 pr-4 font-medium">Status</th>
                      <th className="pb-2 font-medium">Priority</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/6">
                    {analytics.taskItems.map((task) => (
                      <tr key={task.id}>
                        <td className="py-2 pr-4 font-medium text-gray-800 dark:text-white">{task.task}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{task.department || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{task.assignee || '—'}</td>
                        <td className="py-2 pr-4 text-gray-600 dark:text-gray-300">{task.status}</td>
                        <td className="py-2 text-gray-600 dark:text-gray-300">{task.priority}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState message="No project tasks were returned for this selection." />}
          </Panel>
        </div>
      )}

      {analytics && reportTab === 'development' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="Training Compliance">
            {analytics.trainingCompliance.length
              ? <BarList rows={analytics.trainingCompliance.map((item) => ({
                  label: item.mandatory ? `${item.label} (Mandatory)` : item.label,
                  pct: item.pct,
                  color: item.pct >= 90 ? '#22c55e' : item.pct >= 60 ? '#f5bd02' : '#ef4444',
                }))} />
              : <EmptyState message="No training compliance data was returned by this project." />}
          </Panel>
          <Panel title="Completion by Department">
            {analytics.deptCompletion.length
              ? <BarList rows={analytics.deptCompletion.map((item) => ({ ...item, color: '#3b82f6' }))} />
              : <EmptyState message="No department completion data is available." />}
          </Panel>
        </div>
      )}

      {analytics && reportTab === 'records' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Panel title="Hours Logged by Department">
            {analytics.deptHours.length
              ? <BarList rows={analytics.deptHours.map((item) => ({ ...item, color: '#3b82f6' }))} />
              : <EmptyState message="No department hours were returned by this project." />}
          </Panel>
          <Panel title="Punctuality">
            {analytics.punctuality.length
              ? <BarList rows={analytics.punctuality.map((item) => ({
                  ...item,
                  color: item.pct >= 97 ? '#22c55e' : item.pct >= 90 ? '#f5bd02' : '#f97316',
                }))} />
              : <EmptyState message="No punctuality data was returned by this project." />}
          </Panel>
        </div>
      )}

      {analytics && (
        <p className="mt-5 text-right text-[10px] text-gray-400">
          Last synced {new Date(analytics.metadata.lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <h2 className="mb-4 text-[13px] font-bold text-gray-800 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}

function BarList({ rows }: { rows: { label: string; pct: number; color?: string; sub?: string }[] }) {
  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between gap-3">
            <span className="text-[12px] font-medium text-gray-700 dark:text-gray-200">{row.label}</span>
            <span className="shrink-0 text-[12px] font-bold" style={{ color: row.color || '#3b82f6' }}>
              {row.sub ?? `${row.pct}%`}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-[#2a2a2a]">
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${Math.max(0, Math.min(100, row.pct))}%`, backgroundColor: row.color || '#3b82f6' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <p className="py-4 text-[12px] text-gray-500 dark:text-gray-400">{message}</p>;
}

function RefreshIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <polyline points="23,4 23,10 17,10" />
      <path d="M20.5 15a9 9 0 1 1-.5-7.9" />
    </svg>
  );
}
