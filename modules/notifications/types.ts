export type NotificationType = 'info' | 'warning' | 'success' | 'error';

export interface Notification {
  id: string;
  recipientUid: string;
  type: NotificationType;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
}
