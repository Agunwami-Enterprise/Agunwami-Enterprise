import type { NotifItem } from '../types/notification';
export type { NotifItem };
export declare function routeForNotif(n: Pick<NotifItem, 'relatedTo'>): string;
/** Mark a single notification as read. */
export declare function markNotifRead(id: string): Promise<void>;
/** Mark multiple notifications as read in a single batch write. */
export declare function markAllNotifsRead(ids: string[]): Promise<void>;
/** Subscribe to all notifications for a given user (newest first). */
export declare function subscribeNotifications(uid: string, cb: (items: NotifItem[]) => void): () => void;
