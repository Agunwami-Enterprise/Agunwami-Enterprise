// ─── Leave Request Service ────────────────────────────────────────────────────

import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getDb } from './firebase-instance';
import { fmtDate } from '../utils/time';
import type { LeaveRequest, LeaveStatus } from '../types/leave';

export type { LeaveRequest, LeaveStatus };

function mapStatus(s: string): LeaveStatus {
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

function mapType(t: string): string {
  const map: Record<string, string> = {
    annual:    'Annual Leave',
    sick:      'Sick Leave',
    unpaid:    'Personal Leave',
    maternity: 'Maternity Leave',
    paternity: 'Paternity Leave',
  };
  return map[t] ?? t;
}

/** Subscribe to all leave requests ordered by start date (newest first). */
export function subscribeLeaveRequests(
  cb: (reqs: LeaveRequest[]) => void,
): () => void {
  const q = query(collection(getDb(), 'leaveRequests'), orderBy('startDate', 'desc'));
  return onSnapshot(
    q,
    (snap: any) => {
      cb(snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id:        d.id,
          employee:  (data.userName || data.staffName || 'Staff Member') as string,
          aehubId:   data.aehubId as string | undefined,
          type:      mapType(data.leaveType as string),
          startDate: fmtDate(data.startDate),
          endDate:   fmtDate(data.endDate || data.startDate),
          days:      (data.days || data.daysRequested || 1) as number,
          status:    mapStatus(data.status as string),
          reason:    data.reason as string | undefined,
        } satisfies LeaveRequest;
      }));
    },
    (err: any) => console.warn('[agunwami-backend] LeaveRequests snapshot error:', err),
  );
}
