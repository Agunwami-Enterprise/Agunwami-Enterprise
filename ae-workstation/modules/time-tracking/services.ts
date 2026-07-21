import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface TimeRecord {
  id: string; staffId: string; date: string;
  clockIn: string; clockOut: string;
  hours: string; project: string;
  status: 'Approved' | 'Pending';
}

function fmtTime(ts: { toDate(): Date } | null | undefined): string {
  if (!ts) return '-';
  return ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts: { toDate(): Date }): string {
  return ts.toDate().toISOString().split('T')[0];
}

// Clock-in/out writes go through a Cloud Function for audit integrity.
export function subscribeTimeTracking(cb: (records: TimeRecord[]) => void): () => void {
  const q = query(collection(db, 'timeTracking'), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => {
      const data = d.data();
      return {
        id:       d.id,
        staffId:  data.staffId as string,
        date:     fmtDate(data.date as { toDate(): Date }),
        clockIn:  fmtTime(data.clockIn  as { toDate(): Date }),
        clockOut: fmtTime(data.clockOut as { toDate(): Date }),
        hours:    (() => {
          const h = data.hoursWorked as number ?? 0;
          return `${Math.floor(h)}h ${Math.round((h % 1) * 60).toString().padStart(2,'0')}m`;
        })(),
        project:  (data.notes as string | undefined)?.trim() || 'General',
        status:   ((data.status as string) === 'approved' ? 'Approved' : 'Pending') as 'Approved' | 'Pending',
      };
    }));
  });
}
