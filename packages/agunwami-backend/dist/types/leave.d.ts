export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';
export interface LeaveRequest {
    id: string;
    employee: string;
    aehubId?: string;
    type: string;
    startDate: string;
    endDate: string;
    days: number;
    status: LeaveStatus;
    reason?: string;
}
