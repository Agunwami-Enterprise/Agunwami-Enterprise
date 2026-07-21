import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export type TrainingStatus = 'not-started' | 'in-progress' | 'completed';

export interface Training {
  id: string; title: string; category: string; hours: number;
  status: TrainingStatus; progress: number;
  dueDate: string; overdue: boolean; mandatory: boolean;
  assignedTo: string[]; color: string;
}

const CAT_COLORS: Record<string, string> = {
  'Security': '#3b82f6', 'Leadership': '#f5bd02', 'Finance': '#22c55e',
  'Compliance': '#8b5cf6', 'Engineering': '#ec4899', 'Customer Service': '#0d9488',
  'Health & Safety': '#f97316',
};

export function subscribeTraining(cb: (items: Training[]) => void): () => void {
  const q = query(collection(db, 'training'), orderBy('dueDate'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => {
      const data = d.data();
      const dueDate = (data.dueDate as { toDate(): Date }).toDate();
      const status = data.status as TrainingStatus;
      return {
        id:          d.id,
        title:       data.title as string,
        category:    data.category as string,
        hours:       0,
        status,
        progress:    data.completionRate as number,
        dueDate:     dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        overdue:     status !== 'completed' && dueDate < new Date(),
        mandatory:   data.isMandatory as boolean,
        assignedTo:  ((data.assignedTo as string[]) ?? []).slice(0, 2).map(uid => uid.length > 20 ? uid.slice(0, 8) : uid),
        color:       CAT_COLORS[data.category as string] ?? '#6366f1',
      };
    }));
  });
}
