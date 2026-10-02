/**
 * backend/modules/leave-requests/leave-requests.types.ts
 *
 * Types for CEO Leave Requests & Approvals.
 */

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export type LeaveType = 'Vacation' | 'Sick' | 'Personal' | 'Maternity' | 'Casual' | 'Bereavement';

export interface LeaveRequestItem {
  id: string;
  userId: string;
  employeeName: string;
  employeeEmail?: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface LeaveSummaryStats {
  totalRequests: number;
  pendingApprovals: number;
  approved: number;
  rejected: number;
  currentlyOnLeave: number;
}

export interface LeaveApprovalDto {
  status: 'Approved' | 'Rejected';
  reviewerId?: string;
  reviewerName?: string;
  comments?: string;
}
