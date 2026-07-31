export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity';

export interface LeaveRequest {
  id: string;
  staffUid: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  status: LeaveStatus;
  reason: string;
  reviewedByUid: string | null;
  reviewedAt: string | null;
}
