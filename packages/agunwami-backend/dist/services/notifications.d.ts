import { type Firestore } from 'firebase/firestore';
import type { NotifItem } from '../types/notification';
export type { NotifItem };
export declare function routeForNotif(n: Pick<NotifItem, 'relatedTo'>): string;
/** Mark a single notification as read. Pass `db` when notifications live in another project. */
export declare function markNotifRead(id: string, db?: Firestore): Promise<void>;
/** Mark multiple notifications as read in a single batch write. */
export declare function markAllNotifsRead(ids: string[], db?: Firestore): Promise<void>;
/**
 * Subscribe to all notifications for a given user (newest first). Pass `db`
 * when notifications live in a different Firebase project than the business
 * data. If the query fails, `cb` receives an empty list (so callers stop
 * loading) and `onError` receives the error.
 */
export declare function subscribeNotifications(uid: string, cb: (items: NotifItem[]) => void, db?: Firestore, onError?: (error: Error) => void): () => void;
