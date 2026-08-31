import type { LeaveRequest, LeaveStatus } from '../types/leave';
export type { LeaveRequest, LeaveStatus };
/** Subscribe to all leave requests ordered by start date (newest first). */
export declare function subscribeLeaveRequests(cb: (reqs: LeaveRequest[]) => void): () => void;
