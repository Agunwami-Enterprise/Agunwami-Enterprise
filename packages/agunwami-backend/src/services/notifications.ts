// ─── Notifications Service ────────────────────────────────────────────────────

import {
  collection, doc, onSnapshot, query, updateDoc, writeBatch, where, orderBy,
} from 'firebase/firestore';
import { getDb } from './firebase-instance';
import { relativeTime } from '../utils/time';
import type { NotifItem } from '../types/notification';

export type { NotifItem };

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
  const col = n.relatedTo?.collection;
  if (!col) return '/ceo/notifications';
  return COLLECTION_ROUTES[col] ?? '/ceo/notifications';
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
  if (type.includes('task'))    return 'tasks';
  if (type.includes('payment')) return 'payments';
  if (type.includes('message')) return 'messages';
  return 'updates';
}

function typeToIcon(type: string): { bg: string; color: string } {
  if (type.includes('task'))    return { bg: '#fee2e2', color: '#ef4444' };
  if (type.includes('payment')) return { bg: '#dbeafe', color: '#2563eb' };
  if (type.includes('message')) return { bg: '#dcfce7', color: '#16a34a' };
  return { bg: '#fef9c3', color: '#d97706' };
}

/** Mark a single notification as read. */
export async function markNotifRead(id: string): Promise<void> {
  await updateDoc(doc(getDb(), 'notifications', id), { read: true });
}

/** Mark multiple notifications as read in a single batch write. */
export async function markAllNotifsRead(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const batch = writeBatch(getDb());
  ids.forEach(id => batch.update(doc(getDb(), 'notifications', id), { read: true }));
  await batch.commit();
}

/** Subscribe to all notifications for a given user (newest first). */
export function subscribeNotifications(
  uid: string,
  cb: (items: NotifItem[]) => void,
): () => void {
  if (!uid) return () => {};
  const q = query(
    collection(getDb(), 'notifications'),
    where('recipientId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snap: any) => {
      cb(snap.docs.map((d: any) => {
        const data = d.data();
        const type = (data.type || 'notification') as string;
        const icon = typeToIcon(type);
        const read = !!data.read;
        return {
          id:        d.id,
          title:     typeToTitle(type),
          body:      (data.message || data.body || '') as string,
          time:      relativeTime(data.createdAt as { toDate(): Date }),
          tag:       read ? '' : 'NEW',
          tagColor:  read ? '' : '#ef4444',
          read,
          iconBg:    icon.bg,
          iconColor: icon.color,
          category:  typeToCategory(type),
          relatedTo: data.relatedTo as { collection: string; docId: string } | undefined,
        } satisfies NotifItem;
      }));
    },
    (err: any) => {
      if ((err as any).code !== 'permission-denied') {
        console.warn('[agunwami-backend] Notifications snapshot error:', err);
      }
    },
  );
}
