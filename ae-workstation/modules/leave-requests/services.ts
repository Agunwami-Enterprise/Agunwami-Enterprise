import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Leave approvals must go through a Cloud Function for atomicity and audit.

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveReq {
  id: string; employee: string; type: string;
  startDate: string; endDate: string; days: number; status: LeaveStatus;
}

function mapStatus(s: string): LeaveStatus {
  if (s === 'approved') return 'Approved';
  if (s === 'rejected') return 'Rejected';
  return 'Pending';
}

function mapType(t: string): string {
  const map: Record<string, string> = {
    annual: 'Annual Leave', sick: 'Sick Leave', unpaid: 'Personal Leave',
    maternity: 'Maternity Leave', paternity: 'Paternity Leave',
  };
  return map[t] ?? t;
}

function fmtDate(ts: { toDate(): Date }): string {
  return ts.toDate().toISOString().split('T')[0];
}

export function subscribeLeaveRequests(cb: (reqs: LeaveReq[]) => void): () => void {
  const q = query(collection(db, 'leaveRequests'), orderBy('startDate', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => {
      const data = d.data();
      return {
        id:        d.id,
        employee:  (data.staffName as string) ?? '',
        type:      mapType(data.leaveType as string),
        startDate: fmtDate(data.startDate as { toDate(): Date }),
        endDate:   fmtDate(data.endDate   as { toDate(): Date }),
        days:      data.daysRequested as number,
        status:    mapStatus(data.status as string),
      };
    }));
  });
}
