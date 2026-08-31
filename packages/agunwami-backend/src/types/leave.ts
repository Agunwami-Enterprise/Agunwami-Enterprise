// ─── Leave Request Types ──────────────────────────────────────────────────────
// Used by both aehub-onboarding (staff leave management UI) and
// agunwami-enterprise (leave request dashboard).

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id:        string;
  employee:  string;
  aehubId?:  string;
  type:      string;
  startDate: string;
  endDate:   string;
  days:      number;
  status:    LeaveStatus;
  reason?:   string;
}
