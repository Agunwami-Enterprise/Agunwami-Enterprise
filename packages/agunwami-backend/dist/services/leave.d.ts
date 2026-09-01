import type { LeaveRequest, LeaveStatus } from '../types/leave';
export type { LeaveRequest, LeaveStatus };
/** Subscribe to all leave requests ordered by start date (newest first). */
export declare function subscribeLeaveRequests(cb: (reqs: LeaveRequest[]) => void): () => void;
/** Approve or reject a leave request */
export declare function updateLeaveRequestStatus(id: string, status: 'approved' | 'rejected'): Promise<void>;
