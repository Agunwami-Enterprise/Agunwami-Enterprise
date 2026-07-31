import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

// Payment initiation must go through a Cloud Function — never a direct client write.

export type PayType   = 'Incoming' | 'Outgoing' | 'Payroll' | 'Refund';
export type PayStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Failed';

export interface Payment {
  id: string; amount: number; type: PayType; status: PayStatus;
  description: string; requestedBy: string; approvedBy: string;
  created: string; processed: string;
}

function mapType(t: string): PayType {
  if (t === 'salary')        return 'Payroll';
  if (t === 'bonus')         return 'Incoming';
  if (t === 'reimbursement') return 'Outgoing';
  return 'Refund';
}

function mapStatus(s: string): PayStatus {
  if (s === 'paid')    return 'Completed';
  if (s === 'pending') return 'Pending';
  if (s === 'failed')  return 'Rejected';
  return 'Pending';
}

function fmt(ts: any): string {
  if (!ts) return '-';
  if (typeof ts === 'string') return ts;
  if (ts.toDate) return ts.toDate().toLocaleString();
  return new Date(ts).toLocaleString();
}

export function subscribePayments(cb: (payments: Payment[]) => void): () => void {
  const q = query(collection(db, 'payments'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    snap => {
      cb(snap.docs.map(d => {
        const data = d.data();
        return {
          id:          d.id,
          amount:      (data.amount || 0) as number,
          type:        mapType(data.type as string),
          status:      mapStatus(data.status as string),
          description: (data.description as string) ?? '',
          requestedBy: (data.staffName || data.requestedBy || 'Staff Member') as string,
          approvedBy:  data.status === 'paid' ? 'Agunwami' : '-',
          created:     fmt(data.date),
          processed:   data.status === 'paid' ? fmt(data.date) : '-',
        };
      }));
    },
    err => {
      console.warn('Payments snapshot error:', err);
    }
  );
}
