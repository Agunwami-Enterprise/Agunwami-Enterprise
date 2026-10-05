/**
 * backend/modules/notifications/notifications.types.ts
 *
 * Types for CEO Notifications & Announcements.
 */

export type NotificationPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  author: string;
  authorEmail?: string;
  department: string;
  priority: NotificationPriority;
  targetAudience: 'ALL' | 'STAFF' | 'STUDENTS' | 'EXECUTIVES';
  createdAt: string;
  pinned?: boolean;
}

export interface ExecutiveNotification {
  id: string;
  title: string;
  message: string;
  type: 'task' | 'leave' | 'payment' | 'system' | 'attendance';
  priority: NotificationPriority;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface BroadcastAnnouncementDto {
  title: string;
  content: string;
  department?: string;
  priority?: NotificationPriority;
  targetAudience?: 'ALL' | 'STAFF' | 'STUDENTS' | 'EXECUTIVES';
}
