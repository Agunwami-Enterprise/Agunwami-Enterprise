/**
 * backend/modules/dashboard/dashboard.service.ts
 *
 * Dedicated backend service for the CEO Overview Dashboard page.
 * Powered by real Firestore collections from aehub-eafa6 with zero dummy fallbacks.
 */

import { listDocs, getDoc } from '../../core/firestore';
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
    const [users, attendance, leaveReqs, staffReqs, salaryDisb, payments, announcements, latestSnapshot, staffTasks] =
      await Promise.all([
        listDocs('users', 100).catch(() => []),
        listDocs('attendanceLogs', 100).catch(() => []),
        listDocs('leaveRequests', 100).catch(() => []),
        listDocs('staffRequests', 100).catch(() => []),
        listDocs('salary_disbursements', 100).catch(() => []),
        listDocs('payments', 100).catch(() => []),
        listDocs('announcements', 100).catch(() => []),
        getDoc('analytics_snapshots', new Date().toISOString().split('T')[0]).catch(() => null),
        listDocs('staffTasks', 100).catch(() => []),
      ]);

    const staffUsers = users.filter(u => u.role === 'staff' || u.isStaff === true);
    const totalStaff = staffUsers.length;

    // Active staff: employed staff whose accounts are NOT disabled or fired
    const activeStaff = staffUsers.filter(u => {
      if (u.disabled === true || u.isDisabled === true) return false;
      if (u.isFired === true || u.fired === true) return false;
      if (u.isSuspended === true) return false;
      const s = String(u.status || '').toLowerCase().trim();
      return s !== 'disabled' && s !== 'fired' && s !== 'inactive' && s !== 'suspended' && s !== 'terminated';
    }).length;

    // Clocked in staff: staff members who are actively clocked in on duty today
    const today = new Date().toISOString().split('T')[0];
    const clockedInStaff = staffUsers.filter(u => {
      const status = String(u.status || '').toLowerCase().trim();
      if (status === 'clocked in') return true;

      const isToday = u.initialClockInDate === today || u.lastClockInDate === today;
      const clockIn = Number(u.clockInTime) || 0;
      const clockOut = Number(u.clockOutTime) || 0;
      if (isToday && clockIn > clockOut) return true;

      const todayLog = attendance.find(a =>
        (a.userId === u.uid || a.userId === u._id || a.userEmail === u.email) &&
        (a.dateKey === today || a._createTime?.startsWith(today))
      );
      if (todayLog) {
        const logStatus = String(todayLog.status || '').toLowerCase();
        if ((logStatus.includes('in') || logStatus.includes('progress')) && !todayLog.clockOutTime) {
          return true;
        }
      }

      return false;
    }).length;

    let tasksTotal = 0;
    let tasksDone = 0;

    if (latestSnapshot?.tasksByStatus) {
      const byStatus = latestSnapshot.tasksByStatus as Record<string, number>;
      const pending = byStatus.Pending || 0;
      const completed = byStatus.Completed || 0;
      const inProgress = byStatus['In Progress'] || 0;
      const overdue = byStatus.Overdue || 0;
      tasksTotal = pending + completed + inProgress + overdue;
      tasksDone = completed;
    } else if (latestSnapshot?.tasksCompleted != null) {
      tasksDone = latestSnapshot.tasksCompleted;
      tasksTotal = staffTasks.length;
    } else {
      tasksTotal = staffTasks.length;
      tasksDone = staffTasks.filter(t => String(t.status || '').toLowerCase().includes('comp')).length;
    }

    const pendingLeaves = leaveReqs.filter(l => (l.status as string)?.toLowerCase() === 'pending').length;
    const pendingStaff = staffReqs.filter(s => (s.status as string)?.toLowerCase() === 'pending').length;
    const pendingDisbursements = salaryDisb.filter(s => (s.status as string)?.toLowerCase() === 'pending').length;
    const pendingPayments = payments.filter(p => (p.status as string)?.toUpperCase() === 'PENDING').length;
    const pendingApprovals = pendingLeaves + pendingStaff + pendingDisbursements + pendingPayments;

    const health = Math.max(70, Math.min(99, Math.round(98 - (pendingLeaves * 3) - (pendingStaff * 2))));

    return {
      totalStaff,
      activeStaff,
      clockedInStaff,
      tasksTotal,
      tasksDone,
      pendingApprovals,
      announcementsCount: announcements.length,
      aeHubHealth: health,
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
      listDocs('announcements', 20).catch(() => []),
      listDocs('leaveRequests', 20).catch(() => []),
      listDocs('payments', 20).catch(() => []),
      listDocs('attendanceLogs', 20).catch(() => []),
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
        project: 'AE Hub',
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
        project: 'AE Hub',
        time:    formatRelativeTime(timeVal),
        text:    `${att.userName || 'Staff member'} clocked in (${att.department || 'Operations'})`,
        type:    'task',
        _ts:     typeof timeVal === 'number' ? timeVal : timeVal ? new Date(timeVal).getTime() : 0,
      });
    }

    // Dynamic Activity: Query projects with a configured feedEndpoint
    const projectDocs = await listDocs('enterprise_projects', 50).catch(() => []);
    const externalFeedPromises = projectDocs
      .filter(p => p.feedEndpoint && typeof p.feedEndpoint === 'string' && p.feedEndpoint.trim().length > 0)
      .map(async p => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const res = await fetch(p.feedEndpoint, {
            headers: { Accept: 'application/json' },
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (res.ok) {
            const data = await res.json();
            const rawList = Array.isArray(data)
              ? data
              : (data.feed || data.activities || data.items || data.events || []);

            return rawList.map((entry: any, idx: number) => {
              const timeVal = entry.time || entry.createdAt || entry.timestamp || entry.date || entry._createTime;
              const ts = typeof timeVal === 'number'
                ? timeVal
                : timeVal ? new Date(timeVal).getTime() : Date.now();
              return {
                id: entry.id ? `ext-${p._id || p.id}-${entry.id}` : `ext-${p._id || p.id}-${idx}`,
                project: p.name || 'External',
                time: formatRelativeTime(timeVal || new Date()),
                text: entry.text || entry.title || entry.message || entry.description || 'Activity update',
                type: (entry.type === 'announcement' || entry.type === 'payment' || entry.type === 'leave')
                  ? entry.type
                  : 'task',
                _ts: isNaN(ts) ? Date.now() : ts,
              };
            });
          }
        } catch {
          // Unreachable feed endpoint, safely ignore
        }
        return [];
      });

    const externalResults = await Promise.all(externalFeedPromises);
    for (const batch of externalResults) {
      items.push(...batch);
    }

    items.sort((a, b) => b._ts - a._ts);
    return items.slice(0, limitCount);
  }

  /**
   * 4. Pending Approvals
   * Ingests approvals dynamically from configured project endpoints (leave requests, staff requests, stipends)
   * as well as direct Firestore collections. Deduplicates by ID.
   */
  static async getApprovals(limitCount = 20): Promise<ApprovalItem[]> {
    const [projects, leaveReqs, staffReqs, salaryDisb, payments] = await Promise.all([
      ProjectsService.getProjectsOverview().catch(() => []),
      listDocs('leaveRequests', 50).catch(() => []),
      listDocs('staffRequests', 50).catch(() => []),
      listDocs('salary_disbursements', 50).catch(() => []),
      listDocs('payments', 50).catch(() => []),
    ]);

    const approvalMap = new Map<string, ApprovalItem>();

    // 1. Ingest approvals returned by project endpoints (e.g. AE Hub /api/enterprise/metrics)
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

    // 2. Direct Firestore: Leave Requests
    for (const l of leaveReqs) {
      if ((l.status as string)?.toLowerCase() === 'pending') {
        const id = String(l._id);
        const name = l.userName || l.staffName || l.employee || 'Staff Member';
        approvalMap.set(id, {
          id,
          title: 'Leave Request',
          project: 'AE Hub',
          urgent: Boolean(l.urgent || false),
          subtitle: `${name} — ${l.days || 1} day(s) (${l.leaveType || l.type || 'Annual Leave'})`,
          details: l.reason || 'No additional reason provided.',
          type: 'leave',
          sourceCollection: 'leaveRequests',
          createdAt: l.createdAt || l.appliedAt || l._createTime || null,
        });
      }
    }

    // 3. Direct Firestore: Staff Requests
    for (const sr of staffReqs) {
      if ((sr.status as string)?.toLowerCase() === 'pending') {
        const id = String(sr._id);
        const requester = sr.requesterName || sr.userName || 'Staff Member';
        const dept = sr.department || 'General';
        const title = sr.title ? `Staff Request: ${sr.title}` : `Staff Request: ${sr.position || sr.type || 'Headcount'}`;
        approvalMap.set(id, {
          id,
          title,
          project: sr.projectName || 'AE Hub',
          urgent: Boolean(sr.priority === 'High' || sr.urgency === 'urgent' || sr.urgent),
          subtitle: `${requester} (${dept}) — ${sr.headcount ? `${sr.headcount} position(s)` : sr.position || 'Staff Request'}`,
          details: sr.justification || sr.description || sr.reason || 'Staff request awaiting executive review.',
          type: 'staff',
          sourceCollection: 'staffRequests',
          createdAt: sr.createdAt || sr.appliedAt || sr._createTime || null,
        });
      }
    }

    // 4. Direct Firestore: Salary Disbursements
    for (const s of salaryDisb) {
      if ((s.status as string)?.toLowerCase() === 'pending') {
        const id = String(s._id);
        const name = s.staffName || 'Staff Member';
        const amountStr = s.amount ? `₦${Number(s.amount).toLocaleString()}` : '';
        const title = s.type === 'Sprint Stipend' ? 'Sprint Stipend Request' : 'Salary Disbursement Request';
        approvalMap.set(id, {
          id,
          title,
          project: 'AE Hub',
          urgent: Boolean(s.urgent || false),
          subtitle: `${name} (${s.role || s.department || 'Staff'}) — ${amountStr}`,
          details: s.notes || `${s.month || 'Current period'} ${s.type || 'Disbursement'}. Account: ${s.bankName || 'Bank'} ${s.accountNumber || ''}`,
          type: 'payment',
          sourceCollection: 'salary_disbursements',
          createdAt: s.createdAt || s.date || s._createTime || null,
        });
      }
    }

    // 5. Direct Firestore: Completed/Pending Payments
    for (const p of payments) {
      if ((p.status as string)?.toUpperCase() === 'PENDING') {
        const id = String(p._id);
        const reqName = p.requestedByName || p.requestedBy || 'Staff Member';
        const amountStr = p.amount ? `₦${Number(p.amount).toLocaleString()}` : '';
        approvalMap.set(id, {
          id,
          title: 'Payment Authorization',
          project: 'Enterprise',
          urgent: Boolean(p.urgent || false),
          subtitle: `${p.description || p.purpose || 'Disbursement'} — ${amountStr}`,
          details: `Requested by ${reqName}. Currency: ${p.currency || 'NGN'}. Ref: ${p.reference || p._id}`,
          type: 'payment',
          sourceCollection: 'payments',
          createdAt: p.createdAt || p._createTime || null,
        });
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
    const projects = await ProjectsService.getProjectsOverview().catch(() => []);
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
        if (p.id === 'ae-hub') {
          monthObj.aeHub = val;
        }
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
