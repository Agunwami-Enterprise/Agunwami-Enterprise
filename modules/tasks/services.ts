import { collection, onSnapshot, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

export type Priority   = 'High' | 'Medium' | 'Low';
export type TaskStatus = 'In Progress' | 'Pending' | 'Completed' | 'Overdue';

export interface Task {
  id: string; title: string; assignee: string;
  dueDate: string; status: TaskStatus; priority: Priority;
}

function mapStatus(s: string, dueDate: Date): TaskStatus {
  if (s === 'completed')   return 'Completed';
  if (s === 'in-review')   return 'In Progress';
  if (s === 'in-progress') return dueDate < new Date() ? 'Overdue' : 'In Progress';
  return dueDate < new Date() ? 'Overdue' : 'Pending';
}

function mapPriority(p: string): Priority {
  return p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';
}

async function loadNameMap(): Promise<Map<string, string>> {
  const snap = await getDocs(collection(db, 'staff'));
  const m = new Map<string, string>();
  snap.docs.forEach(d => { m.set(d.id, (d.data().name as string) ?? d.id); });
  return m;
}

export function subscribeTasks(cb: (tasks: Task[]) => void): () => void {
  let realUnsub = () => {};
  loadNameMap().then(names => {
    const q = query(collection(db, 'tasks'), orderBy('createdAt', 'desc'));
    realUnsub = onSnapshot(q, snap => {
      cb(snap.docs.map(d => {
        const data = d.data();
        const due  = (data.dueDate as { toDate(): Date }).toDate();
        return {
          id:       d.id,
          title:    data.title as string,
          assignee: names.get(data.assignedTo as string) ?? (data.assignedTo as string),
          dueDate:  due.toISOString().split('T')[0],
          status:   mapStatus(data.status as string, due),
          priority: mapPriority(data.priority as string),
        };
      }));
    });
  });
  return () => realUnsub();
}
