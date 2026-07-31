import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

export interface AnalyticsSummary {
  staffOverview?:    Record<string, unknown>;
  taskSummary?:      Record<string, unknown>;
  leaveOverview?:    Record<string, unknown>;
  paymentSummary?:   Record<string, unknown>;
  attendanceSummary?: Record<string, unknown>;
}

export function subscribeAnalytics(cb: (data: AnalyticsSummary) => void): () => void {
  return onSnapshot(
    collection(db, 'analytics'),
    snap => {
      const data: AnalyticsSummary = {};
      snap.docs.forEach(d => {
        (data as Record<string, unknown>)[d.id] = d.data();
      });
      cb(data);
    },
    err => {
      console.warn('Analytics snapshot error:', err);
    }
  );
}
