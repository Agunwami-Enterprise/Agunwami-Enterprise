'use client';

import { useEffect, useState } from 'react';
import { SkeletonDashboard } from '@/app/components/ceo/Skeleton';
import { useAuth } from '@/lib/workstation/auth-context';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/* CEO executive dashboard — project metrics come from each configured project endpoint. */

// ── API response types ────────────────────────────────────────────────────────

interface OverviewStats {
  totalStaff:         number | null;
  activeStaff:        number | null;
  clockedInStaff:     number | null;
  tasksTotal:         number | null;
  tasksDone:          number | null;
  pendingApprovals:   number | null;
  announcementsCount: number | null;
}

interface FeedEntry {
  id:      string;
  project: string;
  time:    string;
  text:    string;
  type:    'announcement' | 'task' | 'leave' | 'payment' | 'course';
}

interface LiveApprovalItem {
  id:               string;
  title:            string;
  project:          string;
  urgent:           boolean;
  subtitle:         string;
  details:          string;
  type:             'leave' | 'payment' | 'task' | 'staff';
  sourceCollection: string;
  createdAt:        string | null;
  adminUrl?:        string | null;
}

interface RevenueMonth {
  month:    string;
  [projectId: string]: number | string | null | undefined;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<Date | null>(null);

  const [apiProjects, setApiProjects] = useState<ApiProject[]  | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);

  // Modal state
  const [showExecReport,  setShowExecReport]  = useState(false);
  const [showBroadcast,   setShowBroadcast]   = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<LiveApprovalItem | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  async function reloadProjects() {
    try {
      const res = await fetch('/api/ceo/projects/overview?refresh=1');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Could not load projects (${res.status}).`);
      if (!Array.isArray(data.projects)) throw new Error('Projects response is invalid.');
      setApiProjects(data.projects);
      setProjectsError(null);
    } catch (err) {
      console.error('Failed to reload projects:', err);
      setProjectsError(err instanceof Error ? err.message : 'Could not load projects.');
    }
  }

  async function handleDeleteProject(id: string, name: string) {
    if (!confirm(`Are you sure you want to remove project "${name}"? This will delete its configuration.`)) return;
    setDeletingProjectId(id);
    try {
      const res = await fetch(`/api/ceo/projects?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      if (res.ok) {
        await reloadProjects();
      } else {
        alert('Failed to delete project');
      }
    } catch {
      alert('Error deleting project');
    } finally {
      setDeletingProjectId(null);
    }
  }

  // Live timer
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Project endpoint responses are the sole dashboard metrics source.
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      try {
        const response = await fetch('/api/ceo/projects/overview');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || `Could not load projects (${response.status}).`);
        if (!Array.isArray(data.projects)) throw new Error('Projects response is invalid.');
        if (!cancelled) {
          setApiProjects(data.projects);
          setProjectsError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setProjectsError(error instanceof Error ? error.message : 'Could not load project metrics.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadAll();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <SkeletonDashboard />;

  const displayName    = user?.displayName?.split(' ')[0] || 'Agunwami';
  const currentHour    = (now ?? new Date()).getHours();
  const greeting       = currentHour < 12 ? 'Good morning' : currentHour < 17 ? 'Good afternoon' : 'Good evening';
  const dateFormatted  = now ? now.toLocaleDateString('en-GB',  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const timeFormatted  = now ? now.toLocaleTimeString('en-US',  { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '';
  const subDateFormatted = now ? now.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' }) : '';

  // Helper: format a nullable number as a string or '—'
  const fmt = (n: number | null | undefined): string => n != null ? n.toLocaleString() : '—';

  const metricNumber = (project: ApiProject, pattern: RegExp): number | null => {
    const metric = project.metrics.find(item => pattern.test(item.label));
    if (!metric || metric.value == null || metric.value === '—') return null;
    const parsed = Number(metric.value.replace(/[^\d.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const sumAvailable = (values: Array<number | null | undefined>): number | null => {
    const known = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    return known.length ? known.reduce((total, value) => total + value, 0) : null;
  };
  const projectStaffCount = (project: ApiProject): number | null =>
    project.staff ? project.staff.length :
      project.departments?.some(department => department.headcount != null)
        ? project.departments.reduce((total, department) => total + (department.headcount ?? 0), 0)
        : metricNumber(project, /^(total\s*)?(staff|employees|team members)$/i);
  const projectActiveStaffCount = (project: ApiProject): number | null => {
    const metric = metricNumber(project, /active\s*(staff|employees)/i);
    if (metric != null) return metric;
    if (!project.staff?.some(staff => staff.status)) return null;
    return project.staff.filter(staff => ['active', 'clocked in', 'on shift', 'onshift'].includes(String(staff.status).toLowerCase())).length;
  };
  const projectClockedInCount = (project: ApiProject): number | null => {
    const metric = metricNumber(project, /clocked[\s-]*in/i);
    if (metric != null) return metric;
    if (!project.staff?.some(staff => staff.status)) return null;
    return project.staff.filter(staff => ['clocked in', 'on shift', 'onshift'].includes(String(staff.status).toLowerCase())).length;
  };
  const projectPendingApprovals = (project: ApiProject): number | null => {
    if (project.approvals && project.approvals.length > 0) return project.approvals.length;
    const reportedCount = metricNumber(project, /pending\s*approvals/i);
    return reportedCount ?? (project.approvals ? project.approvals.length : null);
  };
  const overview: OverviewStats = {
    totalStaff: sumAvailable((apiProjects ?? []).map(projectStaffCount)),
    activeStaff: sumAvailable((apiProjects ?? []).map(projectActiveStaffCount)),
    clockedInStaff: sumAvailable((apiProjects ?? []).map(projectClockedInCount)),
    tasksTotal: sumAvailable((apiProjects ?? []).map(project =>
      project.tasks?.total ?? metricNumber(project, /tasks?\s*(total|assigned)/i),
    )),
    tasksDone: sumAvailable((apiProjects ?? []).map(project =>
      project.tasks?.completed ?? metricNumber(project, /tasks?\s*(completed|done)|completed\s*tasks/i),
    )),
    pendingApprovals: sumAvailable((apiProjects ?? []).map(projectPendingApprovals)),
    announcementsCount: sumAvailable((apiProjects ?? []).map(project => metricNumber(project, /announcements?/i))),
  };
  const liveApprovals = apiProjects?.flatMap(project =>
    (project.approvals ?? []).map(approval => ({ ...approval, project: project.name, adminUrl: project.adminUrl })),
  ) ?? null;
  const feedItems = apiProjects?.flatMap(project =>
    (project.activity ?? []).map(activity => ({
      ...activity,
      project: project.name,
      time: activity.time ? new Date(activity.time).toLocaleString() : 'Time unavailable',
    })),
  ) ?? null;
  const revenueData: RevenueMonth[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index), 1);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const values: RevenueMonth = { month };
    for (const project of apiProjects ?? []) {
      const trend = project.revenueTrend?.find(item =>
        item.month.toLowerCase() === month.toLowerCase() ||
        item.month.toLowerCase().startsWith(month.toLowerCase()),
      );
      if (trend) values[project.id] = trend.revenue;
    }
    return values;
  });
  const pendingCount = liveApprovals && liveApprovals.length > 0
    ? liveApprovals.length
    : overview.pendingApprovals;

  const totalEmployees = overview.totalStaff;
  const activeStaffCount = overview.activeStaff;
  const clockedInCount = overview.clockedInStaff;
  const totalTasksDone = overview.tasksDone;
  const totalTasksAssigned = overview.tasksTotal;
  const totalPendingApprovals = pendingCount;

  // ── 4. Combined Monthly Revenue calculated on the Client ───────────────────
  const calculatedCombinedRevenue = (() => {
    if (!apiProjects || apiProjects.length === 0) return '—';

    let sumNGN = 0;
    let sumUSD = 0;
    let hasAnyRev = false;

    for (const p of apiProjects) {
      const revMetric = p.metrics?.find(m => m.label.toLowerCase().includes('rev'));
      if (!revMetric || !revMetric.value || revMetric.value === '—') continue;

      const raw = revMetric.value.trim();
      const isUSD = raw.includes('$');
      const num = parseFloat(raw.replace(/[^0-9.]/g, ''));

      if (!isNaN(num) && num > 0) {
        hasAnyRev = true;
        let mult = 1;
        if (raw.toUpperCase().includes('M')) mult = 1_000_000;
        else if (raw.toUpperCase().includes('K')) mult = 1_000;

        if (isUSD) {
          sumUSD += num * mult;
        } else {
          sumNGN += num * mult;
        }
      }
    }

    if (!hasAnyRev) return '—';

    const fmtNGN = sumNGN >= 1_000_000
      ? `₦${(sumNGN / 1_000_000).toFixed(2)}M`
      : `₦${sumNGN.toLocaleString()}`;
    const fmtUSD = sumUSD >= 1_000_000
      ? `$${(sumUSD / 1_000_000).toFixed(2)}M`
      : `$${sumUSD.toLocaleString()}`;

    if (sumNGN > 0 && sumUSD > 0) return `${fmtNGN} + ${fmtUSD}`;
    if (sumUSD > 0) return fmtUSD;
    return fmtNGN;
  })();

  // ── 5. System Health: Point directly to failing system(s) if any ───────────
  const systemHealthStat = (() => {
    if (!apiProjects || apiProjects.length === 0) {
      return {
        value: '—',
        subtext: 'No systems registered',
        trend: 'neutral' as const,
        iconColor: '#94a3b8',
      };
    }

    const degraded = apiProjects.filter(p =>
      p.status === 'error' ||
      (p.health !== null && p.health < 60) ||
      p.metrics?.some(m => String(m.value || '').toLowerCase().includes('unreach'))
    );

    const onlineProjects = apiProjects.filter(p => p.status === 'online');
    const pendingProjects = apiProjects.filter(p => p.status === 'pending');

    // Case A: All systems are pending configuration (no telemetry yet)
    if (onlineProjects.length === 0 && degraded.length === 0 && pendingProjects.length > 0) {
      return {
        value: 'Pending',
        subtext: 'Awaiting telemetry',
        trend: 'neutral' as const,
        iconColor: '#f59e0b',
      };
    }

    // Calculate real score strictly from explicit reported scores:
    const explicitScores = apiProjects
      .filter(p => p.status === 'online' && typeof p.health === 'number' && !isNaN(p.health))
      .map(p => p.health as number);

    const averageExplicitHealth = explicitScores.length > 0
      ? Math.round(explicitScores.reduce((a, b) => a + b, 0) / explicitScores.length)
      : null;

    // Case B: Exactly 1 system degraded or offline
    if (degraded.length === 1) {
      const failed = degraded[0];
      const isSingleProject = apiProjects.length === 1;
      const displayVal = isSingleProject
        ? (failed.health !== null && failed.health > 0 ? `${failed.health}%` : 'Offline')
        : 'Degraded';

      return {
        value: displayVal,
        subtext: failed.status === 'error'
          ? `Alert: ${failed.name} metrics endpoint failed`
          : `Alert: ${failed.name} reported low health`,
        trend: 'alert' as const,
        iconColor: '#ef4444',
      };
    }

    // Case C: Multiple systems degraded or offline
    if (degraded.length > 1) {
      const names = degraded.map(p => p.name).slice(0, 2).join(', ');
      const more = degraded.length > 2 ? ` +${degraded.length - 2}` : '';
      return {
        value: 'Offline',
        subtext: `Alert: ${degraded.length} systems degraded (${names}${more})`,
        trend: 'alert' as const,
        iconColor: '#ef4444',
      };
    }

    // Case D: All active systems are operational
    const projectsWithoutHealth = apiProjects.filter(project => project.health == null).length;
    return {
      value: averageExplicitHealth !== null ? `${averageExplicitHealth}%` : '—',
      subtext: averageExplicitHealth === null
        ? 'Health scores not reported by project endpoints'
        : projectsWithoutHealth > 0
          ? `Average of reporting projects · ${projectsWithoutHealth} without a score`
          : apiProjects.length === 1 ? `${apiProjects[0].name} reported health` : 'Average reported project health',
      trend: averageExplicitHealth === null ? 'neutral' as const : 'up' as const,
      iconColor: averageExplicitHealth === null ? '#94a3b8' : '#10b981',
    };
  })();

  return (
    <div className="min-h-full space-y-6 p-4 sm:p-6 lg:p-8">
      {/* ── 1. Header & Live Clock Section ────────────────────────────── */}
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-gray-900 dark:text-white">
            {greeting}, {displayName}.
          </h1>
          <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
            {dateFormatted} · AE Command Centre
          </p>

          <div className="mt-4">
            <div className="text-[28px] font-extrabold tracking-tight text-gray-900 tabular-nums dark:text-white leading-tight">
              {timeFormatted}
            </div>
            <div className="text-[12px] font-medium text-gray-400 dark:text-gray-500">
              {subDateFormatted}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            onClick={() => setShowExecReport(true)}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-gray-200 dark:hover:bg-[#282828]"
          >
            <ChartBarIcon />
            <span>Executive Report</span>
          </button>

          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 rounded-lg bg-[#E5A800] px-4 py-2.5 text-[12px] font-semibold text-gray-950 shadow-sm transition hover:brightness-95 active:scale-[0.99]"
          >
            <span>Broadcast Announcement</span>
          </button>
        </div>
      </div>

      {/* ── 2. KPI Metric Cards Grid (4x2) ─────────────────────────────── */}
      <div className="ae-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Active Projects */}
        <MetricCard
          label="Configured Projects"
          value={apiProjects ? String(apiProjects.length) : '—'}
          subtext={
            apiProjects
              ? `${apiProjects.filter(project => project.status === 'online').length} reporting endpoints`
              : 'Loading ventures'
          }
          trend="up"
          topIcon={<SparklineIcon color="#eab308" />}
        />

        {/* Card 2: Total Employees (Consolidated across Enterprise & Projects) */}
        <MetricCard
          label="Total Employees"
          value={fmt(totalEmployees)}
          subtext={
            activeStaffCount != null
              ? `${activeStaffCount} Active (Accounts in Good Standing)`
              : 'Active workforce data unavailable'
          }
          trend="up"
          topIcon={<UsersIcon color="#3b82f6" />}
        />

        {/* Card 3: Staff Clocked In (Attendance on duty today) */}
        <MetricCard
          label="Staff Clocked In"
          value={fmt(clockedInCount)}
          subtext={
            totalEmployees != null && totalEmployees > 0 && clockedInCount != null
              ? `${Math.round((clockedInCount / totalEmployees) * 100)}% on duty today`
              : 'Attendance data unavailable'
          }
          trend="neutral"
          topIcon={<ClockCircleIcon color="#10b981" />}
        />

        {/* Card 4: Tasks Completed */}
        <MetricCard
          label="Tasks Completed"
          value={fmt(totalTasksDone)}
          subtext={
            totalTasksAssigned != null
              ? `of ${totalTasksAssigned} total tasks`
              : 'Task data unavailable'
          }
          trend="up"
          topIcon={<SparklineIcon color="#eab308" />}
        />

        {/* Card 5: Pending Approvals */}
        <MetricCard
          label="Pending Approvals"
          value={fmt(totalPendingApprovals)}
          subtext={totalPendingApprovals == null ? 'Approval data unavailable' : `${totalPendingApprovals} reported across project endpoints`}
          trend={totalPendingApprovals == null ? 'neutral' : totalPendingApprovals > 0 ? 'alert' : 'neutral'}
          topIcon={<AlertCircleIcon color={totalPendingApprovals != null && totalPendingApprovals > 0 ? '#ef4444' : '#94a3b8'} />}
        />

        {/* Card 6: Combined Monthly Revenue (Client Calculated) */}
        <MetricCard
          label="Combined Revenue"
          value={calculatedCombinedRevenue}
          subtext={apiProjects ? `${apiProjects.length} configured projects` : 'Monthly total'}
          trend="up"
          topIcon={<DollarSignIcon color="#10b981" />}
        />

        {/* Card 7: Announcements */}
        <MetricCard
          label="Announcements"
          value={fmt(overview?.announcementsCount)}
          subtext={overview?.announcementsCount == null ? 'No data available' : 'Enterprise announcements'}
          trend="up"
          topIcon={<ClientIcon color="#8b5cf6" />}
        />

        {/* Card 8: System Health (Pinpoints failing system or multiple failures) */}
        <MetricCard
          label="Project Health Score"
          value={systemHealthStat.value}
          subtext={systemHealthStat.subtext}
          trend={systemHealthStat.trend}
          topIcon={<WifiIcon color={systemHealthStat.iconColor} />}
        />
      </div>

      {/* ── 3. Projects Overview Section ──────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">
              Projects Overview
            </h2>
            <span className="text-[12px] font-medium text-gray-400 dark:text-gray-500">
              {projectsError
                ? 'Project data unavailable'
                : apiProjects
                  ? `${apiProjects.length} Project${apiProjects.length === 1 ? '' : 's'} Configured`
                  : 'Loading ventures…'}
            </span>
          </div>

          <button
            onClick={() => router.push('/ceo/projects/new')}
            className="inline-flex items-center gap-2 rounded-xl bg-[#E5A800] px-4 py-2 text-[12px] font-bold text-gray-950 shadow-sm transition hover:brightness-105 active:scale-95"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>Add Project</span>
          </button>
        </div>

        {projectsError ? (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-[12px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            Could not load project metrics: {projectsError}
            <button
              onClick={() => void reloadProjects()}
              className="ml-2 font-semibold underline"
            >
              Retry
            </button>
          </div>
        ) : apiProjects === null ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="h-56 animate-pulse rounded-2xl border border-gray-100 bg-gray-50/50 p-4 dark:border-white/6 dark:bg-white/3" />
            ))}
          </div>
        ) : apiProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-[#1e1e1e]">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/40">
              <BuildingIcon />
            </div>
            <h3 className="mt-3 text-[15px] font-bold text-gray-900 dark:text-white">No Projects Registered</h3>
            <p className="mt-1 max-w-sm text-[12px] text-gray-500 dark:text-gray-400">
              Add enterprise projects and configure each project&rsquo;s metrics endpoint to report dashboard data.
            </p>
            <button
              onClick={() => router.push('/ceo/projects/new')}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E5A800] px-4 py-2 text-[12px] font-bold text-gray-950 shadow-sm transition hover:brightness-105"
            >
              + Add First Project
            </button>
          </div>
        ) : (
          <div className="ae-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {apiProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onView={() => router.push(`/ceo/projects/${encodeURIComponent(project.id)}`)}
                onEdit={() => router.push(`/ceo/projects/${encodeURIComponent(project.id)}/edit`)}
                onDelete={() => handleDeleteProject(project.id, project.name)}
                isDeleting={deletingProjectId === project.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 4. Executive Activity Feed & Pending Approvals ── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Left: Executive Activity Feed — from /api/ceo/activity-feed */}
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
          <div className="flex items-center gap-2 mb-1">
            <SparklineIcon color="#eab308" />
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Executive Activity Feed</h3>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">Live updates across all projects</p>

          <div className="divide-y divide-gray-50 dark:divide-white/4">
            {feedItems === null ? (
              <p className="py-4 text-[12px] text-gray-400">
                {projectsError ? 'Activity unavailable because project data could not be loaded.' : 'Loading activity…'}
              </p>
            ) : feedItems.length === 0 ? (
              <p className="py-4 text-[12px] text-gray-400">No recent activity found.</p>
            ) : (
              feedItems.map(act => (
                <div key={act.id} className="flex items-start gap-3.5 py-3 first:pt-0 last:pb-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600">
                    {act.type === 'announcement' ? <MegaphoneIcon /> :
                     act.type === 'leave'        ? <ClipboardCheckIcon /> :
                     act.type === 'payment'      ? <DollarSignIcon color="#10b981" /> :
                     <SparklineIcon color="#eab308" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-amber-100/70 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                        {act.project}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{act.time}</span>
                    </div>
                    <p className="mt-1 text-[12px] text-gray-700 dark:text-gray-300 leading-snug">{act.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Pending Approvals — from /api/ceo/approvals */}
        <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircleIcon color="#ef4444" />
            <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">Pending Approvals</h3>
          </div>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-4">Read-only status reported by project metrics endpoints</p>

          <div className="divide-y divide-gray-50 dark:divide-white/4">
            {liveApprovals === null ? (
              <p className="py-4 text-[12px] text-gray-400">
                {projectsError ? 'Approvals unavailable because project data could not be loaded.' : 'Loading approvals…'}
              </p>
            ) : liveApprovals.length === 0 && overview.pendingApprovals == null ? (
              <p className="py-4 text-[12px] text-gray-400">Approval data unavailable.</p>
            ) : liveApprovals.length === 0 && overview.pendingApprovals === 0 ? (
              <p className="py-4 text-[12px] text-gray-400">No pending approvals.</p>
            ) : liveApprovals.length === 0 ? (
              <p className="py-4 text-[12px] text-gray-400">
                {overview.pendingApprovals} pending approval{overview.pendingApprovals === 1 ? '' : 's'} reported; request details are not included by the project metrics endpoint.
              </p>
            ) : (
              liveApprovals.map(item => {
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span className="text-[13px] font-bold text-gray-900 dark:text-white">{item.title}</span>
                        {item.urgent && (
                          <span className="rounded bg-red-100/80 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/60 dark:text-red-400">Urgent</span>
                        )}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          item.type === 'staff'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                            : item.type === 'leave'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                            : item.type === 'payment'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                              : item.type === 'task'
                              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
                        }`}>
                            {item.type === 'staff' ? 'Staff Request' : item.type === 'leave' ? 'Leave' : item.type === 'payment' ? 'Disbursement' : item.type === 'task' ? 'Task Approval' : 'Request'}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                          {item.project}
                        </span>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400 leading-snug">{item.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <button
                        onClick={() => setSelectedApproval(item)}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                      >
                        View
                      </button>
                      {item.adminUrl && (
                        <a
                          href={item.adminUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-[#E5A800] px-3.5 py-1.5 text-[11px] font-bold text-gray-950 shadow-sm transition hover:brightness-95"
                        >
                          Review in project
                        </a>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── 5. Revenue by Project — 6 Month Trend ─────────────────────── */}
      <RevenueTrendCard projects={apiProjects} months={revenueData} />

      {/* ── 6. Project Health Scores & Quick Navigation ───────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ProjectHealthScoresCard projects={apiProjects} />
        <QuickNavigationCard
          onOpenReports={() => setShowExecReport(true)}
          onOpenBroadcast={() => setShowBroadcast(true)}
        />
      </div>

      {/* ── 7. Modals ─────────────────────────────────────────────────── */}
      {showExecReport && (
        <ExecutiveReportModal
          onClose={() => setShowExecReport(false)}
          overview={overview}
          projects={apiProjects}
          revenueData={revenueData}
          combinedRevenue={calculatedCombinedRevenue}
        />
      )}

      {showBroadcast && (
        <BroadcastModal
          onClose={() => setShowBroadcast(false)}
          overview={overview}
        />
      )}

      {selectedApproval && (
        <LiveApprovalDetailModal
          item={selectedApproval}
          onClose={() => setSelectedApproval(null)}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUBCOMPONENTS
═══════════════════════════════════════════════════════════════════════════ */

interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  trend: 'up' | 'down' | 'alert' | 'neutral';
  topIcon: React.ReactNode;
}

function MetricCard({ label, value, subtext, trend, topIcon }: MetricCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-white/6 dark:bg-[#1e1e1e]">
      <div className="flex items-start justify-between">
        <span className="text-[13px] font-medium text-gray-600 dark:text-gray-400">
          {label}
        </span>
        <div className="flex h-6 w-6 items-center justify-center">
          {topIcon}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[26px] font-bold text-gray-900 tracking-tight dark:text-white">
          {value}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-[11px]">
          {trend === 'up' && (
            <span className="flex items-center gap-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <UpRightArrowIcon />
              {subtext}
            </span>
          )}
          {trend === 'alert' && (
            <span className="flex items-center gap-0.5 font-medium text-red-500 dark:text-red-400">
              <DownRightArrowIcon />
              {subtext}
            </span>
          )}
          {trend === 'neutral' && (
            <span className="text-gray-500 dark:text-gray-400 font-normal">
              {subtext}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// API-returned project shape (from /api/ceo/projects or /api/ceo/projects/overview)
export interface ApiProject {
  id: string;
  name: string;
  subtitle: string;
  description?: string;
  lead?: string;
  adminUrl: string | null;
  apiEndpoint: string | null;
  hasApiToken?: boolean;
  color?: string;
  metrics: { label: string; value: string | null }[];
  health: number | null;
  endpointError?: string;
  revenueTrend?: { month: string; revenue: number }[];
  approvals?: LiveApprovalItem[];
  activity?: Array<{
    id: string;
    text: string;
    time: string | null;
    type: FeedEntry['type'];
  }>;
  staff?: Array<{ id: string; name: string; department?: string; role?: string; status?: string }>;
  departments?: Array<{
    id: string;
    name: string;
    headcount: number;
    staff?: ApiProject['staff'];
    tasksTotal?: number;
    tasksCompleted?: number;
  }>;
  tasks?: {
    total: number;
    completed: number;
    inProgress?: number;
    items?: Array<{
      id: string;
      task: string;
      assignee?: string;
      department?: string;
      dueDate?: string;
      status: string;
      priority: string;
    }>;
  };
  status?: 'online' | 'pending' | 'error';
  stale?: boolean;
  lastSyncedAt?: string;
}

function ProjectCard({
  project,
  onView,
  onEdit,
  onDelete,
  isDeleting,
}: {
  project: ApiProject;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}) {
  const color = project.color || '#d97706';

  return (
    <div className="ae-lift flex flex-col justify-between overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
      {/* Tinted Header */}
      <div
        className="border-b p-4 relative"
        style={{
          backgroundColor: `${color}12`,
          borderColor: `${color}25`,
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold text-[13px] tracking-tight uppercase"
              style={{
                backgroundColor: `${color}25`,
                color: color,
              }}
            >
              {project.name.slice(0, 2)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white leading-tight truncate">
                  {project.name}
                </h3>
                <span className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.2 text-[9px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-400">
                  {project.status === 'error'
                    ? 'Endpoint error'
                    : project.stale
                      ? 'Last sync shown'
                      : project.status === 'online'
                      ? 'Metrics live'
                      : project.apiEndpoint
                        ? 'Awaiting metrics'
                        : 'Endpoint not configured'}
                </span>
              </div>
              <p className="truncate text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                {project.subtitle}
              </p>
            </div>
          </div>

          {/* Quick Edit & Delete Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              title="Edit project configuration"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-black/5 hover:text-gray-700 dark:hover:bg-white/10 dark:hover:text-white transition"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              disabled={isDeleting}
              title="Delete project"
              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400 transition disabled:opacity-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Body Stats */}
      <div className="p-4 space-y-4">
        {project.endpointError && (project.stale ? (
          <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
            Endpoint unreachable — showing data from {project.lastSyncedAt ? new Date(project.lastSyncedAt).toLocaleString() : 'the last sync'}. {project.endpointError}
          </p>
        ) : (
          <p role="status" className="rounded-lg bg-red-50 px-3 py-2 text-[11px] text-red-700 dark:bg-red-950/30 dark:text-red-300">
            Metrics endpoint failed: {project.endpointError}
          </p>
        ))}

        {/* Metric Columns */}
        <div className="grid grid-cols-3 gap-2 text-center">
          {project.metrics && project.metrics.length > 0 ? (
            project.metrics.slice(0, 3).map((m, i) => (
              <div key={i} className="flex flex-col">
                <span className="text-[14px] font-bold text-gray-900 dark:text-white tracking-tight truncate">
                  {m.value ?? '—'}
                </span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                  {m.label}
                </span>
              </div>
            ))
          ) : (
            <div className="col-span-3 py-1 text-[11px] text-gray-400">
              No metrics available
            </div>
          )}
        </div>

        {/* Health Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="font-medium text-gray-500 dark:text-gray-400">Health</span>
            <span className="font-bold" style={{ color: project.health != null ? color : '#94a3b8' }}>
              {project.health != null ? `${project.health}%` : '—'}
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${project.health ?? 0}%`,
                backgroundColor: project.health != null ? color : 'transparent',
              }}
            />
          </div>
        </div>
      </div>

      {/* Footer Link */}
      <div className="flex items-center divide-x divide-gray-100 border-t border-gray-100 dark:divide-white/6 dark:border-white/6">
        {project.adminUrl ? (
          <a
            href={project.adminUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50/80 hover:text-gray-950 dark:text-gray-300 dark:hover:bg-white/3 dark:hover:text-white"
          >
            <span>Project Admin</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        ) : (
          <button
            onClick={onEdit}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-[11px] font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition"
          >
            <span>+ Set Admin URL</span>
          </button>
        )}
        <button
          onClick={onView}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-2.5 text-[12px] font-semibold text-gray-500 transition hover:bg-gray-50/80 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-white"
        >
          <span>Details</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function RevenueTrendCard({
  projects,
  months,
}: {
  projects: ApiProject[] | null;
  months: RevenueMonth[] | null;
}) {
  const chartHeight = 220;
  const chartWidth  = 760;
  const padLeft     = 65;
  const padBottom   = 30;
  const padTop      = 16;
  const padRight    = 20;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const activeProjects = projects || [];
  const hasRevenueData =
    activeProjects.some(project => project.revenueTrend?.some(item => item.revenue > 0)) ||
    Boolean(months?.some(month =>
      Object.entries(month).some(([key, value]) => key !== 'month' && typeof value === 'number' && value > 0),
    ));

  const monthLabels = months && months.length > 0
    ? months.map(m => m.month)
    : (() => {
        const now = new Date();
        const res: string[] = [];
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          res.push(d.toLocaleString('en-US', { month: 'short' }));
        }
        return res;
      })();

  // Calculate highest revenue amount across all projects and months
  let maxRevenueFound = 0;
  for (const label of monthLabels) {
    const monthObj = months?.find(m => m.month.toLowerCase() === label.toLowerCase());
    for (const p of activeProjects) {
      let val = 0;
      const item = p.revenueTrend?.find(
        t => t.month.toLowerCase() === label.toLowerCase() || t.month.toLowerCase().startsWith(label.toLowerCase())
      );
      if (item && item.revenue > 0) {
        val = item.revenue;
      } else if (monthObj && monthObj[p.id] != null) {
        val = Number(monthObj[p.id]) * 1000;
      }
      if (val > maxRevenueFound) maxRevenueFound = val;
    }
  }

  // Round upper ceiling for Y axis
  const ceiling = maxRevenueFound > 0
    ? Math.max(100_000, Math.ceil(maxRevenueFound * 1.2 / (maxRevenueFound > 5_000_000 ? 1_000_000 : maxRevenueFound > 1_000_000 ? 500_000 : 100_000)) * (maxRevenueFound > 5_000_000 ? 1_000_000 : maxRevenueFound > 1_000_000 ? 500_000 : 100_000))
    : 1_000_000;

  function fmtTick(val: number): string {
    if (val <= 0) return '0';
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}M`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return String(Math.round(val));
  }

  const yTicks = [
    { val: ceiling,        label: fmtTick(ceiling) },
    { val: ceiling * 0.75, label: fmtTick(ceiling * 0.75) },
    { val: ceiling * 0.50, label: fmtTick(ceiling * 0.50) },
    { val: ceiling * 0.25, label: fmtTick(ceiling * 0.25) },
    { val: 0,              label: '0' },
  ];

  const groupWidth = innerW / Math.max(monthLabels.length, 1);
  const numProjects = Math.max(activeProjects.length, 1);
  const totalSlot = groupWidth * 0.72;
  const barWidth = Math.max(6, Math.min(16, Math.floor(totalSlot / numProjects - 2)));
  const barGap = Math.max(2, Math.min(4, Math.floor(barWidth * 0.3)));
  const actualGroupWidth = numProjects * barWidth + (numProjects - 1) * barGap;

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
      <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">
            Revenue by Project — 6 Month Trend
          </h3>
          <p className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">
            Revenue information reported by configured project records
          </p>
        </div>
        <span className="text-[11px] font-semibold text-gray-400">
          {activeProjects.length} Venture{activeProjects.length === 1 ? '' : 's'} Tracked
        </span>
      </div>

      {!projects && !months ? (
        <p className="py-8 text-center text-[12px] text-gray-400">Loading revenue data…</p>
      ) : activeProjects.length === 0 ? (
        <p className="py-8 text-center text-[12px] text-gray-400">No enterprise projects configured yet.</p>
      ) : !hasRevenueData ? (
        <p className="py-8 text-center text-[12px] text-gray-400">
          Revenue data is unavailable until a data source is connected.
        </p>
      ) : (
        <div className="w-full overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[640px] select-none">
            {yTicks.map(t => {
              const y = padTop + innerH - (t.val / ceiling) * innerH;
              return (
                <g key={t.val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#f1f5f9"
                    strokeWidth="1"
                    strokeDasharray={t.val === 0 ? undefined : '3 3'}
                    className="dark:stroke-white/6"
                  />
                  <text
                    x={padLeft - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="11"
                    fill="#94a3b8"
                  >
                    {t.label}
                  </text>
                </g>
              );
            })}

            {monthLabels.map((month, i) => {
              const startX = padLeft + i * groupWidth + (groupWidth - actualGroupWidth) / 2;
              const monthObj = months?.find(m => m.month.toLowerCase() === month.toLowerCase());

              return (
                <g key={month}>
                  {activeProjects.map((p, j) => {
                    let val = 0;
                    const item = p.revenueTrend?.find(
                      t => t.month.toLowerCase() === month.toLowerCase() || t.month.toLowerCase().startsWith(month.toLowerCase())
                    );
                    if (item && item.revenue > 0) {
                      val = item.revenue;
                    } else if (monthObj && monthObj[p.id] != null) {
                      val = Number(monthObj[p.id]) * 1000;
                    }

                    const h = ceiling > 0 && val > 0 ? (val / ceiling) * innerH : 0;
                    const x = startX + j * (barWidth + barGap);
                    const color = p.color || '#d97706';

                    return (
                      <rect
                        key={p.id}
                        x={x}
                        y={padTop + innerH - h}
                        width={barWidth}
                        height={Math.max(h, 2)}
                        rx="3"
                        fill={val > 0 ? color : 'transparent'}
                        stroke={val > 0 ? undefined : '#cbd5e1'}
                        strokeWidth={val > 0 ? 0 : 0.5}
                        strokeDasharray={val > 0 ? undefined : '2 2'}
                        className="transition-all hover:opacity-85"
                      >
                        <title>{`${p.name} (${month}): ${val > 0 ? (val >= 1_000_000 ? (val / 1_000_000).toFixed(2) + 'M' : val.toLocaleString()) : '—'}`}</title>
                      </rect>
                    );
                  })}
                  <text
                    x={startX + actualGroupWidth / 2}
                    y={padTop + innerH + 18}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#64748b"
                  >
                    {month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Dynamic Project Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-5 text-[12px] font-medium text-gray-700 dark:text-gray-300">
        {activeProjects.map(p => (
          <div key={p.id} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm shrink-0"
              style={{ backgroundColor: p.color || '#d97706' }}
            />
            <span>{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 6. Project Health Scores Card ─────────────────────────────────────── */
function ProjectHealthScoresCard({ projects }: { projects: ApiProject[] | null }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">
            Project Health Scores
          </h3>
          <span className="text-[11px] font-semibold text-gray-400">
            {projects ? `${projects.length} Ventures` : '…'}
          </span>
        </div>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5 mt-0.5">
          Overall operational health per project
        </p>

        {!projects ? (
          <div className="py-6 text-center text-[12px] text-gray-400">Loading venture health…</div>
        ) : projects.length === 0 ? (
          <div className="py-6 text-center text-[12px] text-gray-400">No projects registered yet.</div>
        ) : (
          <div className="space-y-4">
            {projects.map(p => {
              const color = p.color || '#eab308';
              return (
                <div key={p.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span>{p.name}</span>
                    </div>
                    <span
                      className="font-bold text-[12px]"
                      style={{
                        color: p.health != null ? color : p.status === 'error' ? '#ef4444' : '#94a3b8',
                      }}
                    >
                      {p.health != null
                        ? `${p.health}%`
                        : p.status === 'error'
                        ? 'Endpoint error'
                        : p.status === 'online'
                          ? 'Not reported'
                          : 'Awaiting metrics'}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${p.health ?? 0}%`,
                        backgroundColor: p.health != null ? color : 'transparent',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── 7. Quick Navigation Card ──────────────────────────────────────────── */
interface NavAction {
  label: string;
  href?: string;
  action?: 'reports' | 'broadcast' | 'search';
  icon: React.ReactNode;
}

function QuickNavigationCard({
  onOpenReports,
  onOpenBroadcast,
}: {
  onOpenReports: () => void;
  onOpenBroadcast: () => void;
}) {
  const leftCol: NavAction[] = [
    { label: 'Staff Management', href: '/ceo/staff',        icon: <UsersIcon color="#3b82f6" /> },
    { label: 'Analytics',        href: '/ceo/analytics',    icon: <ChartBarIcon /> },
    { label: 'Global Search',    action: 'search',          icon: <SparklineIcon color="#eab308" /> },
    { label: 'Tasks',            href: '/ceo/tasks',        icon: <ClipboardCheckIcon /> },
  ];

  const rightCol: NavAction[] = [
    { label: 'Finance & Payments', href: '/ceo/payments',   icon: <DollarSignIcon color="#10b981" /> },
    { label: 'Reports',            action: 'reports',       icon: <ChartBarIcon /> },
    { label: 'Announcements',      action: 'broadcast',     icon: <MegaphoneIcon /> },
    { label: 'Documents',          href: '/ceo/documents',  icon: <DocumentTextIcon /> },
  ];

  function renderBtn(item: NavAction) {
    const content = (
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-500 dark:text-gray-400">
            {item.icon}
          </span>
          <span className="truncate text-[12px] font-semibold text-gray-800 dark:text-gray-200">
            {item.label}
          </span>
        </div>
        <span className="text-[12px] text-gray-400 dark:text-gray-500 ml-1">›</span>
      </div>
    );

    const baseClass = "flex items-center rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:bg-gray-50/80 hover:border-gray-200 dark:border-white/6 dark:bg-[#1a1a1a] dark:hover:bg-white/4";

    if (item.href) {
      return (
        <Link key={item.label} href={item.href} className={baseClass}>
          {content}
        </Link>
      );
    }

    return (
      <button
        key={item.label}
        onClick={() => {
          if (item.action === 'reports') onOpenReports();
          if (item.action === 'broadcast') onOpenBroadcast();
          if (item.action === 'search') {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (searchInput) searchInput.focus();
          }
        }}
        className={baseClass}
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
      <div>
        <h3 className="text-[16px] font-bold text-gray-900 dark:text-white">
          Quick Navigation
        </h3>
        <p className="text-[12px] text-gray-500 dark:text-gray-400 mb-5 mt-0.5">
          Jump to any section of the command centre
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-2.5">
            {leftCol.map(renderBtn)}
          </div>
          <div className="space-y-2.5">
            {rightCol.map(renderBtn)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Approval Detail Modal ──────────────────────────────────────────────── */
function LiveApprovalDetailModal({
  item,
  onClose,
}: {
  item: LiveApprovalItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1a1a1a]">
        <div className="flex items-start justify-between border-b border-gray-100 pb-3.5 dark:border-white/8">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded px-1.5 py-0.5 text-[10px] font-bold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300">
                {item.project}
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                item.type === 'staff'
                  ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                  : item.type === 'leave'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                  : item.type === 'payment'
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300'
              }`}>
                {item.type === 'staff' ? 'Staff Request' : item.type === 'leave' ? 'Leave Request' : item.type === 'payment' ? 'Disbursement' : 'Decision'}
              </span>
              {item.urgent && (
                <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-600">Urgent Priority</span>
              )}
            </div>
            <h2 className="mt-1 text-[17px] font-bold text-gray-900 dark:text-white leading-tight">{item.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <CloseIcon />
          </button>
        </div>

        <div className="my-4 space-y-3 text-[13px]">
          <div className="rounded-xl bg-gray-50 p-3.5 dark:bg-white/4">
            <span className="text-[11px] text-gray-400 block mb-0.5">Subject &amp; Scope</span>
            <p className="font-semibold text-gray-900 dark:text-white">{item.subtitle}</p>
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Decision Details</span>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[12px]">{item.details}</p>
          </div>
          {item.createdAt && (
            <p className="text-[11px] text-gray-400">Submitted: {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-white/8">
          <button onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300"
          >
            Close
          </button>
          {item.adminUrl && (
            <a href={item.adminUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-lg bg-[#E5A800] px-5 py-2 text-[12px] font-bold text-gray-950 shadow-sm transition hover:brightness-95"
            >
              Review in project
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Executive Report Modal ─────────────────────────────────────────────── */
function ExecutiveReportModal({
  onClose,
  overview,
  projects,
  revenueData,
  combinedRevenue,
}: {
  onClose: () => void;
  overview: OverviewStats | null;
  projects: ApiProject[] | null;
  revenueData: RevenueMonth[] | null;
  combinedRevenue?: string;
}) {
  const lastMonth = revenueData && revenueData.length > 0 ? revenueData[revenueData.length - 1] : null;
  let dynamicSumK = 0;
  if (lastMonth) {
    for (const [k, v] of Object.entries(lastMonth)) {
      if (k !== 'month' && typeof v === 'number' && !isNaN(v) && v > 0) {
        dynamicSumK += v;
      }
    }
  }
  const totalRevenue = combinedRevenue && combinedRevenue !== '—'
    ? combinedRevenue
    : dynamicSumK > 0
    ? `$${(dynamicSumK / 1000).toFixed(2)}M`
    : '—';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1a1a1a]">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 dark:border-white/8">
          <div>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              CONFIDENTIAL · EXECUTIVE ACCESS
            </span>
            <h2 className="mt-1 text-[18px] font-bold text-gray-900 dark:text-white">
              AE Command Centre — Executive Monthly Report
            </h2>
            <p className="text-[12px] text-gray-500">
              Live Operations Snapshot · Agunwami Enterprise
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/6"
          >
            <CloseIcon />
          </button>
        </div>

        <div className="my-5 space-y-5 text-[13px] text-gray-700 dark:text-gray-300">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/4">
              <p className="text-[11px] text-gray-500">Total Group Revenue</p>
              <p className="text-[18px] font-bold text-gray-900 dark:text-white">{totalRevenue}</p>
              <span className="text-[10px] text-gray-500 font-medium">Monthly consolidated</span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/4">
              <p className="text-[11px] text-gray-500">Total Headcount</p>
              <p className="text-[18px] font-bold text-gray-900 dark:text-white">
                {overview?.totalStaff != null ? overview.totalStaff.toLocaleString() : '—'}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {overview?.activeStaff != null ? `${overview.activeStaff} Active on Duty` : 'Data unavailable'}
              </span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/4">
              <p className="text-[11px] text-gray-500">Tasks Completed</p>
              <p className="text-[18px] font-bold text-gray-900 dark:text-white">
                {overview?.tasksDone != null ? overview.tasksDone.toLocaleString() : '—'}
              </p>
              <span className="text-[10px] text-emerald-600 font-semibold">
                {overview?.tasksTotal != null ? `of ${overview.tasksTotal} Total Tasks` : 'Data unavailable'}
              </span>
            </div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-white/4">
              <p className="text-[11px] text-gray-500">Configured Projects</p>
              <p className="text-[18px] font-bold text-gray-900 dark:text-white">
                {projects?.length ?? '—'}
              </p>
              <span className="text-[10px] text-gray-500 font-semibold">Enterprise project records</span>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-[14px] font-bold text-gray-900 dark:text-white">
              Venture Performance Matrix
            </h3>
            <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-white/8">
              <table className="w-full text-left text-[12px]">
                <thead className="bg-gray-50 dark:bg-white/4 text-gray-600 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-white/8">
                  <tr>
                    <th className="py-2.5 px-3">Venture</th>
                    <th className="py-2.5 px-3">Key Metrics</th>
                    <th className="py-2.5 px-3">Revenue</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/6">
                  {projects && projects.length > 0 ? (
                    projects.map(p => {
                      const revMetric = p.metrics.find(m => m.label.toLowerCase().includes('revenue'));
                      const otherMetrics = p.metrics.filter(m => !m.label.toLowerCase().includes('revenue'));
                      const metricSummary = otherMetrics
                        .map(m => `${m.value ?? '—'} ${m.label}`)
                        .join(' · ');

                      return (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-white">{p.name}</td>
                          <td className="py-2.5 px-3">{metricSummary || '—'}</td>
                          <td className="py-2.5 px-3">{revMetric?.value ?? '—'}</td>
                          <td className="py-2.5 px-3 font-medium">
                            {p.health != null ? (
                              <span className="text-emerald-600">{p.health}% Health</span>
                            ) : (
                              <span className="text-gray-400">Backend Pending</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-gray-400">
                        Loading venture metrics…
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-white/8">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/4"
          >
            Print Summary
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#E5A800] px-5 py-2 text-[12px] font-semibold text-gray-950 hover:brightness-95"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Broadcast Announcement Modal ───────────────────────────────────────── */
function BroadcastModal({
  onClose,
  overview,
}: {
  onClose: () => void;
  overview: OverviewStats | null;
}) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [audience, setAudience] = useState('All Staff');
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePublish(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setPublishing(true);
    setError(null);
    try {
      await addDoc(collection(db, 'announcements'), {
        title: title.trim(),
        content: content.trim(),
        priority,
        audience,
        author: user?.displayName || 'CEO Agunwami',
        authorId: user?.uid || 'ceo',
        createdAt: serverTimestamp(),
      });
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : 'Could not publish the announcement.');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1a1a1a]">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3.5 dark:border-white/8">
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 dark:text-white">
              Broadcast Executive Announcement
            </h2>
            <p className="text-[11px] text-gray-500">
              Send an official update to the enterprise team.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/6"
          >
            <CloseIcon />
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </p>
        )}

        {success ? (
          <div className="py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h3 className="mt-3 text-[16px] font-bold text-gray-900 dark:text-white">
              Announcement Broadcasted!
            </h3>
            <p className="text-[12px] text-gray-500">
              All staff notifications have been dispatched across AE Command Centre.
            </p>
          </div>
        ) : (
          <form onSubmit={handlePublish} className="mt-4 space-y-4">
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                Announcement Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Q3 Strategic Alignment & Executive Keynote"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[12px] text-gray-800 outline-none transition focus:border-amber-500 dark:border-white/10 dark:bg-[#252525] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={e => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-800 outline-none dark:border-white/10 dark:bg-[#252525] dark:text-white"
                >
                  <option value="High">High (Urgent Notification)</option>
                  <option value="Medium">Medium (General Update)</option>
                  <option value="Low">Low (Informational)</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                  Target Audience
                </label>
                <select
                  value={audience}
                  onChange={e => setAudience(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-800 outline-none dark:border-white/10 dark:bg-[#252525] dark:text-white"
                >
                  <option value="All Staff">
                    All Staff {overview?.totalStaff != null ? `(${overview.totalStaff} Employees)` : ''}
                  </option>
                  <option value="Directors">Department Heads &amp; Directors</option>
                  <option value="Enterprise">Enterprise Team</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                Message Content
              </label>
              <textarea
                required
                rows={4}
                value={content}
                onChange={e => setContent(e.target.value)}
                placeholder="Write your announcement to the team..."
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-[12px] text-gray-800 outline-none transition focus:border-amber-500 dark:border-white/10 dark:bg-[#252525] dark:text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-gray-100 pt-4 dark:border-white/8">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={publishing}
                className="rounded-lg bg-[#E5A800] px-5 py-2 text-[12px] font-bold text-gray-950 transition hover:brightness-95 disabled:opacity-50"
              >
                {publishing ? 'Broadcasting...' : 'Broadcast Announcement'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ── Project Detail Modal ───────────────────────────────────────────────── */
function SparklineIcon({ color = '#eab308' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function UsersIcon({ color = '#3b82f6' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ClockCircleIcon({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function AlertCircleIcon({ color = '#ef4444' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function DollarSignIcon({ color = '#10b981' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function ClientIcon({ color = '#8b5cf6' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function WifiIcon({ color = '#06b6d4' }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
  );
}

function UpRightArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

function DownRightArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="7" y1="7" x2="17" y2="17" />
      <polyline points="17 7 17 17 7 17" />
    </svg>
  );
}

function BookOpenIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="6.01" />
      <line x1="15" y1="6" x2="15" y2="6.01" />
      <line x1="9" y1="10" x2="9" y2="10.01" />
      <line x1="15" y1="10" x2="15" y2="10.01" />
      <line x1="9" y1="14" x2="9" y2="14.01" />
      <line x1="15" y1="14" x2="15" y2="14.01" />
      <path d="M9 18h6v4H9z" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function ShoppingBagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="2" />
      <path d="M9 14l2 2 4-4" />
    </svg>
  );
}

function MegaphoneIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11l18-5v12L3 13v-2z" />
      <path d="M11.6 16.8L14 21h-3l-2-4" />
    </svg>
  );
}

function DocumentTextIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
