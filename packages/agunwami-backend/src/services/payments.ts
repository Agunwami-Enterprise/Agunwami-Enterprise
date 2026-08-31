// ─── Payments Service ─────────────────────────────────────────────────────────

import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { getDb } from './firebase-instance';
import type { Payment, PayType, PayStatus } from '../types/payment';

export type { Payment, PayType, PayStatus };

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

/** Subscribe to all payment records ordered by date (newest first). */
export function subscribePayments(cb: (payments: Payment[]) => void): () => void {
  const q = query(collection(getDb(), 'payments'), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snap: any) => {
      cb(snap.docs.map((d: any) => {
        const data = d.data();
        return {
          id:          d.id,
          amount:      (data.amount || 0)       as number,
          type:        mapType(data.type         as string),
          status:      mapStatus(data.status     as string),
          description: (data.description || '')  as string,
          requestedBy: (data.staffName || data.requestedBy || 'Staff Member') as string,
          approvedBy:  data.status === 'paid' ? 'Agunwami' : '-',
          created:     fmt(data.date),
          processed:   data.status === 'paid' ? fmt(data.date) : '-',
        } satisfies Payment;
      }));
    },
    (err: any) => console.warn('[agunwami-backend] Payments snapshot error:', err),
  );
}
