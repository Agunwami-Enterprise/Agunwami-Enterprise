/**
 * backend/modules/leave-requests/leave-requests.service.ts
 *
 * Server-side Leave Requests Service.
 * Fetches real leave records from AEHub Firestore leaveRequests collection,
 * enriched with user department data.
 */

import { listDocs, getDoc, updateDoc } from '../../core/firestore';
import type {
  LeaveRequestItem,
  LeaveSummaryStats,
  LeaveApprovalDto,
  LeaveStatus,
} from './leave-requests.types';

export class LeaveRequestsService {
  /**
   * Summary metrics for CEO leave dashboard.
   */
  static async getLeaveSummary(): Promise<LeaveSummaryStats> {
    const leaveDocs = await listDocs('leaveRequests', 100).catch(() => []);

    let pending = 0;
    let approved = 0;
    let rejected = 0;

    leaveDocs.forEach(l => {
      const s = String(l.status || '').toLowerCase();
      if (s === 'pending') pending++;
      else if (s === 'approved') approved++;
      else if (s === 'rejected') rejected++;
    });

    return {
      totalRequests: leaveDocs.length,
      pendingApprovals: pending,
      approved,
      rejected,
      currentlyOnLeave: approved,
    };
  }

  /**
   * Fetches leave requests with optional status filter.
   */
  static async getLeaveRequests(status?: LeaveStatus): Promise<LeaveRequestItem[]> {
    const [leaveDocs, users] = await Promise.all([
      listDocs('leaveRequests', 100).catch(() => []),
      listDocs('users', 100).catch(() => []),
    ]);

    const userMap = new Map<string, { email: string; dept: string }>();
    users.forEach(u => {
      userMap.set(u._id, {
        email: u.email || '',
        dept: u.dept || u.department || 'Operations',
      });
      if (u.displayName) {
        userMap.set(u.displayName, {
          email: u.email || '',
          dept: u.dept || u.department || 'Operations',
        });
      }
    });

    let items: LeaveRequestItem[] = leaveDocs.map(doc => {
      const name = doc.employee || doc.userName || 'Staff Member';
      const user = userMap.get(doc.userId) || userMap.get(name);

      let normStatus: LeaveStatus = 'Pending';
      const s = String(doc.status || '').toLowerCase();
      if (s === 'approved') normStatus = 'Approved';
      else if (s === 'rejected') normStatus = 'Rejected';

      return {
        id: doc._id,
        userId: doc.userId || '',
        employeeName: name,
        employeeEmail: doc.userEmail || user?.email,
        department: doc.department || user?.dept || 'Operations',
        type: doc.type || doc.leaveType || 'Annual Leave',
        startDate: doc.startDate || '',
        endDate: doc.endDate || '',
        days: Number(doc.days) || 0,
        status: normStatus,
        reason: doc.reason || '',
        appliedAt: doc.appliedAt || doc.createdAt || doc._createTime || '',
        reviewedBy: doc.reviewedBy,
        reviewedAt: doc.reviewedAt,
      };
    });

    if (status) {
      items = items.filter(i => i.status.toLowerCase() === status.toLowerCase());
    }

    return items;
  }

  /**
   * Approves or rejects a leave request.
   */
  static async updateLeaveStatus(
    id: string,
    dto: LeaveApprovalDto
  ): Promise<boolean> {
    const updated = await updateDoc('leaveRequests', id, {
      status: dto.status,
      reviewedBy: dto.reviewerName || 'Agunwami CEO',
      reviewedAt: new Date().toISOString(),
      comments: dto.comments || '',
    });

    return !!updated;
  }
}
