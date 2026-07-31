import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

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

function fmtDate(ts: any): string {
  if (!ts) return new Date().toISOString().split('T')[0];
  if (typeof ts === 'string') return ts;
  if (ts.toDate) return ts.toDate().toISOString().split('T')[0];
  return new Date(ts).toISOString().split('T')[0];
}

export function subscribeLeaveRequests(cb: (reqs: LeaveReq[]) => void): () => void {
  const q = query(collection(db, 'leaveRequests'), orderBy('startDate', 'desc'));
  return onSnapshot(
    q,
    snap => {
      cb(snap.docs.map(d => {
        const data = d.data();
        return {
          id:        d.id,
          employee:  (data.userName || data.staffName || 'Staff Member') as string,
          type:      mapType(data.leaveType as string),
          startDate: fmtDate(data.startDate),
          endDate:   fmtDate(data.endDate || data.startDate),
          days:      (data.days || data.daysRequested || 1) as number,
          status:    mapStatus(data.status as string),
        };
      }));
    },
    err => {
      console.warn('LeaveRequests snapshot error:', err);
    }
  );
}
