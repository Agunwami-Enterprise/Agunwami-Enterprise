import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface DashboardStats {
  totalStaff: number;
  activeStaff: number;
  tasksTotal: number;
  tasksDone: number;
  pendingApprovals: number;
}

export interface WeeklyPoint { day: string; v: number; }

// Subscribe to /analytics summary documents for live dashboard metrics.
export function subscribeDashboard(
  onStats:   (s: DashboardStats) => void,
  onWeekly:  (pts: WeeklyPoint[]) => void,
): () => void {
  const unsub1 = onSnapshot(collection(db, 'analytics'), snap => {
    const byId: Record<string, Record<string, unknown>> = {};
    snap.docs.forEach(d => { byId[d.id] = d.data() as Record<string, unknown>; });

    const staff   = byId['staffOverview']  ?? {};
    const tasks   = byId['taskSummary']    ?? {};
    const leave   = byId['leaveOverview']  ?? {};
    const attend  = byId['attendanceSummary'] ?? {};

    onStats({
      totalStaff:        (staff['totalStaff']    as number) ?? 0,
      activeStaff:       (staff['activeStaff']   as number) ?? 0,
      tasksTotal:        (tasks['total']          as number) ?? 0,
      tasksDone:         ((tasks['byStatus'] as Record<string,number>)?.completed ?? 0),
      pendingApprovals:  (leave['pendingRequests'] as number) ?? 0,
    });

    const daily = (attend['dailyHours'] as Array<{ day: string; hours: number }>) ?? [];
    onWeekly(daily.map(d => ({ day: d.day, v: d.hours })));
  });

  // Recent tasks for the task card (top 5 in-progress)
  const unsub2 = onSnapshot(
    query(collection(db, 'tasks'), orderBy('createdAt', 'desc'), limit(5)),
    () => { /* page reads directly from tasks state */ },
  );

  return () => { unsub1(); unsub2(); };
};
