/**
 * backend/modules/notifications/notifications.service.ts
 *
 * Server-side Notifications & Announcements Service.
 * Fetches real announcements and notifications from AEHub Firestore.
 */

import { listDocs, createDoc, updateDoc } from '../../core/firestore';
import type {
  AnnouncementItem,
  ExecutiveNotification,
  BroadcastAnnouncementDto,
  NotificationPriority,
} from './notifications.types';

export class NotificationsService {
  /**
   * Fetches corporate announcements.
   */
  static async getAnnouncements(limit = 20): Promise<AnnouncementItem[]> {
    const docs = await listDocs('announcements', limit).catch(() => []);

    return docs.map(doc => ({
      id: doc._id,
      title: doc.title || 'Corporate Announcement',
      content: doc.content || doc.message || doc.body || '',
      author: doc.author || doc.authorName || 'Executive Office',
      authorEmail: doc.authorEmail,
      department: doc.department || 'Executive',
      priority: (doc.priority || 'Medium') as NotificationPriority,
      targetAudience: doc.targetAudience || 'ALL',
      createdAt: doc.createdAt || doc._createTime || '',
      pinned: Boolean(doc.pinned),
    }));
  }

  /**
   * Fetches executive-specific notifications.
   */
  static async getNotifications(limit = 30): Promise<ExecutiveNotification[]> {
    const docs = await listDocs('notifications', limit).catch(() => []);

    return docs.map(doc => ({
      id: doc._id,
      title: doc.title || 'System Notification',
      message: doc.message || doc.content || '',
      type: doc.type || 'system',
      priority: (doc.priority || 'Medium') as NotificationPriority,
      read: Boolean(doc.read || doc.isRead),
      link: doc.link,
      createdAt: doc.createdAt || doc._createTime || '',
    }));
  }

  /**
   * Publishes a new corporate announcement.
   */
  static async createBroadcastAnnouncement(
    dto: BroadcastAnnouncementDto,
    author = 'Agunwami CEO'
  ): Promise<AnnouncementItem | null> {
    const data = {
      title: dto.title,
      content: dto.content,
      author,
      authorEmail: 'that.dev.guy.aeceo@aehub.io',
      department: dto.department || 'CEO',
      priority: dto.priority || 'Medium',
      targetAudience: dto.targetAudience || 'ALL',
      pinned: dto.priority === 'High' || dto.priority === 'Urgent',
      createdAt: new Date().toISOString(),
    };

    const created = await createDoc('announcements', data);
    if (!created) return null;

    return {
      id: created._id,
      ...data,
    };
  }

  /**
   * Marks a notification as read.
   */
  static async markNotificationRead(id: string): Promise<boolean> {
    const updated = await updateDoc('notifications', id, {
      read: true,
      readAt: new Date().toISOString(),
    });
    return !!updated;
  }
}
