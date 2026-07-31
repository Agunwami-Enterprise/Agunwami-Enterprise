import { collection, doc, onSnapshot, query, updateDoc, writeBatch, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

export interface NotifItem {
  id: string; title: string; body: string; time: string;
  tag: string; tagColor: string; read: boolean;
  iconBg: string; iconColor: string;
  category: 'tasks' | 'updates' | 'payments' | 'messages';
  relatedTo?: { collection: string; docId: string };
}

const COLLECTION_ROUTES: Record<string, string> = {
  tasks:         '/ceo/tasks',
  leaveRequests: '/ceo/leave-requests',
  payments:      '/ceo/payments',
  messages:      '/ceo/messages',
  documents:     '/ceo/documents',
  training:      '/ceo/training',
  staff:         '/ceo/staff',
  announcements: '/ceo/dashboard',
};

export function routeForNotif(n: Pick<NotifItem, 'relatedTo'>): string {
  const collection = n.relatedTo?.collection;
  if (!collection) return '/ceo/notifications';
  return COLLECTION_ROUTES[collection] ?? '/ceo/notifications';
}

function typeToTitle(type: string): string {
  const map: Record<string, string> = {
    task_assigned:     'New Task Assigned',
    leave_approved:    'Leave Request Update',
    payment_processed: 'Payment Update',
    announcement:      'Company Announcement',
    message:           'New Message',
  };
  return map[type] ?? 'Notification';
}

function typeToCategory(type: string): NotifItem['category'] {
  if (type.includes('task'))     return 'tasks';
  if (type.includes('payment'))  return 'payments';
  if (type.includes('message'))  return 'messages';
  return 'updates';
}

function typeToIcon(type: string): { bg: string; color: string } {
  if (type.includes('task'))     return { bg: '#fee2e2', color: '#ef4444' };
  if (type.includes('payment'))  return { bg: '#dbeafe', color: '#2563eb' };
  if (type.includes('message'))  return { bg: '#dcfce7', color: '#16a34a' };
  return { bg: '#fef9c3', color: '#d97706' };
}

function relativeTime(ts: { toDate(): Date }): string {
  const diff = Date.now() - ts.toDate().getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
  return `${Math.floor(hr / 24)} day${Math.floor(hr / 24) > 1 ? 's' : ''} ago`;
}

export async function markNotifRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true });
}

export async function markAllNotifsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const batch = writeBatch(db);
  ids.forEach(id => batch.update(doc(db, 'notifications', id), { read: true }));
  await batch.commit();
}

export function subscribeNotifications(uid: string, cb: (items: NotifItem[]) => void): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    snap => {
      cb(snap.docs.map(d => {
        const data  = d.data();
        const type  = (data.type || 'notification') as string;
        const icon  = typeToIcon(type);
        const read  = !!data.read;
        return {
          id:         d.id,
          title:      typeToTitle(type),
          body:       (data.message || data.body || '') as string,
          time:       relativeTime(data.createdAt as { toDate(): Date }),
          tag:        read ? '' : 'NEW',
          tagColor:   read ? '' : '#ef4444',
          read,
          iconBg:     icon.bg,
          iconColor:  icon.color,
          category:   typeToCategory(type),
          relatedTo:  data.relatedTo as { collection: string; docId: string } | undefined,
        };
      }));
    },
    err => {
      console.warn('Notifications snapshot error:', err);
    }
  );
};
