/**
 * backend/modules/dashboard/dashboard.service.ts
 *
 * Dedicated backend service for the CEO Overview Dashboard page.
 * Aggregates data from the Enterprise data project.
 */

import { listDocs } from '../../core/firestore';
import { formatRelativeTime } from '../../core/utils';
import { ProjectsService } from '../projects/projects.service';
import type {
  OverviewStats,
  ProjectCardData,
  FeedItem,
  ApprovalItem,
  RevenueTrendData,
  RevenueMonth,
} from './dashboard.types';

export class DashboardService {
  /**
   * 1. Overview KPIs
   */
  static async getOverview(): Promise<OverviewStats> {
    const projects = await ProjectsService.getProjectsOverview();
    const sumKnown = (values: Array<number | null | undefined>): number | null => {
      const known = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
    };
    const metricNumber = (project: ProjectCardData, pattern: RegExp): number | null => {
      const metric = project.metrics.find(({ label }) => pattern.test(label));
      if (!metric || metric.value == null || metric.value === '—') return null;
      const value = Number(metric.value.replace(/[^\d.-]/g, ''));
      return Number.isFinite(value) ? value : null;
    };
    const taskItems = (project: ProjectCardData) => project.tasks?.items;
    const taskCount = (project: ProjectCardData, field: 'total' | 'completed'): number | null => {
      const summary = project.tasks;
      if (!summary) return metricNumber(project, field === 'total' ? /tasks?\s*(total|assigned)/i : /tasks?\s*(completed|done)/i);
      const directValue = summary[field];
      if (typeof directValue === 'number' && Number.isFinite(directValue)) return directValue;
      const items = taskItems(project);
      if (!items) return null;
      return field === 'total'
        ? items.length
      : items.filter((task) => ['completed', 'approved', 'done', 'closed'].includes(task.status.toLowerCase())).length;
    };
    const knownStaffCount = (project: ProjectCardData): number | null => {
      if (project.staff) return project.staff.length;
      if (project.departments?.some((department) => department.headcount != null)) {
        return project.departments.reduce((sum, department) => sum + (department.headcount ?? 0), 0);
      }
      return metricNumber(project, /^(total\s*)?(staff|employees|team members)$/i);
    };
    const activeStaffCount = (project: ProjectCardData): number | null => {
      const metric = metricNumber(project, /active\s*(staff|employees)/i);
      if (metric !== null) return metric;
      if (!project.staff?.some((staff) => staff.status)) return null;
      return project.staff.filter((staff) =>
        ['active', 'clocked in', 'on shift', 'onshift'].includes(String(staff.status).toLowerCase()),
      ).length;
    };
    const clockedInCount = (project: ProjectCardData): number | null => {
      const metric = metricNumber(project, /clocked[\s-]*in/i);
      if (metric !== null) return metric;
      if (!project.staff?.some((staff) => staff.status)) return null;
      return project.staff.filter((staff) =>
        ['clocked in', 'on shift', 'onshift'].includes(String(staff.status).toLowerCase()),
      ).length;
    };

    return {
      totalStaff: sumKnown(projects.map(knownStaffCount)),
      activeStaff: sumKnown(projects.map(activeStaffCount)),
      clockedInStaff: sumKnown(projects.map(clockedInCount)),
      tasksTotal: sumKnown(projects.map((project) => taskCount(project, 'total'))),
      tasksDone: sumKnown(projects.map((project) => taskCount(project, 'completed'))),
      pendingApprovals: sumKnown(projects.map((project) =>
        project.approvals !== undefined
          ? project.approvals.length
          : metricNumber(project, /pending\s*approvals/i),
      )),
      announcementsCount: sumKnown(projects.map((project) => metricNumber(project, /announcements?/i))),
    };
  }

  /**
   * 2. Projects Overview (delegates to ProjectsService)
   */
  static async getProjects(): Promise<ProjectCardData[]> {
    return ProjectsService.getProjectsOverview();
  }

  /**
   * 3. Activity Feed
   */
  static async getActivityFeed(limitCount = 8): Promise<FeedItem[]> {
    const [announcements, leaveReqs, payments, attendance] = await Promise.all([
      listDocs('announcements', 20),
      listDocs('leaveRequests', 20),
      listDocs('payments', 20),
      listDocs('attendanceLogs', 20),
    ]);

    const items: FeedItem[] = [];

    for (const a of announcements) {
      items.push({
        id:      `ann-${a._id}`,
        project: 'Enterprise',
        time:    formatRelativeTime(a.createdAt || a._createTime),
        text:    `Announcement: ${a.title || 'Company broadcast'}`,
        type:    'announcement',
        _ts:     a.createdAt ? new Date(a.createdAt).getTime() : 0,
      });
    }

    for (const l of leaveReqs) {
      const name = l.userName || l.staffName || l.employee || 'Staff Member';
      items.push({
        id:      `leave-${l._id}`,
        project: 'Enterprise',
        time:    formatRelativeTime(l.createdAt || l.appliedAt || l._createTime),
        text:    `${name} ${String(l.status).toLowerCase() === 'approved' ? 'was approved for' : 'requested'} ${l.leaveType || l.type || 'Annual'} Leave`,
        type:    'leave',
        _ts:     l.createdAt ? new Date(l.createdAt).getTime() : 0,
      });
    }

    for (const p of payments) {
      const amount = p.amount ? `₦${Number(p.amount).toLocaleString()}` : '';
      items.push({
        id:      `pay-${p._id}`,
        project: 'Enterprise',
        time:    formatRelativeTime(p.createdAt || p._createTime),
        text:    `Payment: ${p.description || p.purpose || 'Disbursement'} ${amount ? `(${amount})` : ''} · ${p.status || 'PENDING'}`,
        type:    'payment',
        _ts:     p.createdAt ? new Date(p.createdAt).getTime() : 0,
      });
    }

    for (const att of attendance) {
      const timeVal = att.clockInTime || att.createdAt || att._createTime;
      items.push({
        id:      `att-${att._id}`,
        project: 'Enterprise',
        time:    formatRelativeTime(timeVal),
        text:    `${att.userName || 'Staff member'} clocked in (${att.department || 'Operations'})`,
        type:    'task',
        _ts:     typeof timeVal === 'number' ? timeVal : timeVal ? new Date(timeVal).getTime() : 0,
      });
    }

    items.sort((a, b) => b._ts - a._ts);
    return items.slice(0, limitCount);
  }

  /**
   * 4. Pending Approvals
   * Reads approval data from the Enterprise data project.
   */
  static async getApprovals(limitCount = 20): Promise<ApprovalItem[]> {
    const projects = await ProjectsService.getProjectsOverview();

    const approvalMap = new Map<string, ApprovalItem>();

    // Project records no longer carry imported approval data.
    for (const p of projects) {
      if (p.approvals && Array.isArray(p.approvals)) {
        for (const a of p.approvals) {
          if (!a || !a.id) continue;
          approvalMap.set(String(a.id), {
            id: String(a.id),
            title: a.title,
            project: a.project || p.name,
            urgent: Boolean(a.urgent),
            subtitle: a.subtitle,
            details: a.details,
            type: a.type,
            sourceCollection: a.sourceCollection,
            createdAt: a.createdAt,
          });
        }
      }
    }

    // Sort: Urgent items first, then most recent createdAt
    const sorted = Array.from(approvalMap.values()).sort((a, b) => {
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;
      const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tB - tA;
    });

    return sorted.slice(0, limitCount);
  }

  /**
   * 5. Revenue Trend — Aggregated dynamically across all configured projects
   */
  static async getRevenue(): Promise<RevenueTrendData> {
    const projects = await ProjectsService.getProjectsOverview();
    const now = new Date();
    const months: RevenueMonth[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short' });

      const monthObj: RevenueMonth = {
        month: label,
      };

      for (const p of projects) {
        if (!p.revenueTrend || p.revenueTrend.length === 0) continue;
        const trendItem = p.revenueTrend.find(
          t => t.month.toLowerCase() === label.toLowerCase() || t.month.toLowerCase().startsWith(label.toLowerCase())
        );
        const val = trendItem && trendItem.revenue > 0 ? Math.round(trendItem.revenue / 1000) : null;
        monthObj[p.id] = val;
      }

      months.push(monthObj);
    }

    return { months, combinedRevenue: null };
  }
}

// Named function exports for direct compatibility
export const getOverview = DashboardService.getOverview;
export const getProjects = DashboardService.getProjects;
export const getActivityFeed = DashboardService.getActivityFeed;
export const getApprovals = DashboardService.getApprovals;
export const getRevenue = DashboardService.getRevenue;
