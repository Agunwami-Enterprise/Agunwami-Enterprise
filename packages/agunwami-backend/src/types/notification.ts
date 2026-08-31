// ─── Notification Types ───────────────────────────────────────────────────────
// Merged from:
//   aehub-onboarding/models/notification.ts   → Notification (Firestore doc)
//   agunwami-enterprise/modules/notifications/services.ts → NotifItem (UI shape)

/** Raw Firestore notification document (aehub collection: `notifications`) */
export interface Notification {
  id:       string;
  userId:   string;
  type:     'application' | 'course' | 'academic' | 'system' | 'message' | 'career' | 'task' | 'payment';
  title:    string;
  content:  string;
  link?:    string;
  isRead:   boolean;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  metadata?: {
    applicationId?: string;
    courseId?:      string;
    assessmentId?:  string;
    senderId?:      string;
  };
}

/** UI-ready notification shape (used by the ae-ws notification panel) */
export interface NotifItem {
  id:         string;
  title:      string;
  body:       string;
  time:       string;
  tag:        string;
  tagColor:   string;
  read:       boolean;
  iconBg:     string;
  iconColor:  string;
  category:   'tasks' | 'updates' | 'payments' | 'messages';
  relatedTo?: { collection: string; docId: string };
}
