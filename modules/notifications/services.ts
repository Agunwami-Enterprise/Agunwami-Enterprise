// ─── Notifications ────────────────────────────────────────────────────────────
import {
  subscribeNotifications as subscribeNotificationsIn,
  markNotifRead as markNotifReadIn,
  markAllNotifsRead as markAllNotifsReadIn,
  type NotifItem,
} from 'agunwami-backend';
import { authDb } from '@/lib/workstation/firebase';

export type { NotifItem };
export { routeForNotif } from 'agunwami-backend';

// Notifications live in the workstation (AE Hub) Firebase project, where the
// CEO is signed in and AE Hub's functions write them, not in the enterprise
// data project the shared package reads by default.

export function subscribeNotifications(uid: string, cb: (items: NotifItem[]) => void): () => void {
  return subscribeNotificationsIn(uid, cb, authDb);
}

export function markNotifRead(id: string): Promise<void> {
  return markNotifReadIn(id, authDb);
}

export function markAllNotifsRead(ids: string[]): Promise<void> {
  return markAllNotifsReadIn(ids, authDb);
}
