// ─── Notifications ────────────────────────────────────────────────────────────
import {
  subscribeNotifications as subscribeNotificationsIn,
  markNotifRead as markNotifReadIn,
  markAllNotifsRead as markAllNotifsReadIn,
  type NotifItem,
} from 'agunwami-backend';
import { authDb } from '@/lib/workstation/firebase';

export type { NotifItem } from 'agunwami-backend';
export { routeForNotif } from 'agunwami-backend';

/*
 * Notifications are written by AE Hub (staff tasks, leave, documents) into the
 * workstation Firebase project, where the CEO is signed in. The enterprise
 * data project the shared package reads by default has no signed-in user, so
 * its rules refuse the query and the page never stopped loading.
 */

export function subscribeNotifications(
  uid: string,
  cb: (items: NotifItem[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return subscribeNotificationsIn(uid, cb, authDb, onError);
}

export function markNotifRead(id: string): Promise<void> {
  return markNotifReadIn(id, authDb);
}

export function markAllNotifsRead(ids: string[]): Promise<void> {
  return markAllNotifsReadIn(ids, authDb);
}
