import { type Firestore } from 'firebase/firestore';
import type { NotifItem } from '../types/notification';
export type { NotifItem };
export declare function routeForNotif(n: Pick<NotifItem, 'relatedTo'>): string;
/** Mark a single notification as read. */
export declare function markNotifRead(id: string, db?: Firestore): Promise<void>;
/** Mark multiple notifications as read in a single batch write. */
export declare function markAllNotifsRead(ids: string[], db?: Firestore): Promise<void>;
/**
 * Subscribe to all notifications for a given user (newest first). If the
 * listener fails, `cb` gets an empty list so callers stop waiting.
 */
export declare function subscribeNotifications(uid: string, cb: (items: NotifItem[]) => void, db?: Firestore): () => void;
