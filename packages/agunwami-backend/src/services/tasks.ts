// ─── Tasks Service ────────────────────────────────────────────────────────────

import { collection, onSnapshot, query, getDocs, orderBy } from 'firebase/firestore';
import { getDb } from './firebase-instance';
import type { Task, TaskStatus, TaskPriority } from '../types/task';

export type { Task, TaskStatus, TaskPriority };

function mapStatus(s: string, dueDate: Date): TaskStatus {
  if (s === 'completed')   return 'Completed';
  if (s === 'in-review')   return 'In Progress';
  if (s === 'in-progress') return dueDate < new Date() ? 'Overdue' : 'In Progress';
  return dueDate < new Date() ? 'Overdue' : 'Pending';
}

function mapPriority(p: string): TaskPriority {
  return p === 'high' ? 'High' : p === 'medium' ? 'Medium' : 'Low';
}

async function loadNameMap(): Promise<Map<string, string>> {
  const m = new Map<string, string>();
  try {
    const snap = await getDocs(collection(getDb(), 'users'));
    snap.docs.forEach((d: any) => {
      const data = d.data();
      m.set(d.id, (data.displayName as string) ?? (data.name as string) ?? d.id);
    });
  } catch {
    // Name map load failure is non-fatal
  }
  return m;
}

/** Subscribe to staff tasks ordered by creation date (newest first). */
export function subscribeTasks(cb: (tasks: Task[]) => void): () => void {
  let realUnsub = () => {};
  loadNameMap().then(names => {
    const q = query(collection(getDb(), 'staffTasks'), orderBy('createdAt', 'desc'));
    realUnsub = onSnapshot(
      q,
      (snap: any) => {
        cb(snap.docs.map((d: any) => {
          const data = d.data();
          let due = new Date();
          if (data.dueDate) {
            due = typeof data.dueDate === 'string'
              ? new Date(data.dueDate)
              : (data.dueDate.toDate ? data.dueDate.toDate() : new Date());
          }
          return {
            id:       d.id,
            title:    (data.title || data.task || 'Task') as string,
            assignee: names.get(data.assignedTo as string) ?? (data.assignee as string) ?? 'Staff Member',
            dueDate:  due.toISOString().split('T')[0],
            status:   mapStatus(data.status as string, due),
            priority: mapPriority(data.priority as string),
          } satisfies Task;
        }));
      },
      (err: any) => {
        if ((err as any).code !== 'permission-denied') {
          console.warn('[agunwami-backend] Tasks snapshot error:', err);
        }
      },
    );
  }).catch(() => {});
  return () => realUnsub();
}
export * from './staff-tasks';
