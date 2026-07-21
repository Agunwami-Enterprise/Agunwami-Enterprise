import type { Timestamp } from 'firebase/firestore';

// ─── Firestore doc shapes (matching the seed script) ─────────────────────────

export interface StaffDoc {
  uid: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatarUrl?: string;
  joinDate: Timestamp;
  status: 'active' | 'inactive';
  phone?: string;
  position?: string;
  salary?: number;
  employmentType?: string;
  reportsTo?: string | null;
  location?: string;
}

export interface TaskDoc {
  title: string;
  description?: string;
  assignedTo: string;
  assignedBy: string;
  dueDate: Timestamp;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in-progress' | 'in-review' | 'completed';
  createdAt: Timestamp;
  tags?: string[];
}

export interface MessageConvoDoc {
  participants: string[];
  name?: string;
  lastMessage: string;
  lastMessageAt: Timestamp;
  unreadCount: number;
  type: 'direct' | 'group';
}

export interface DocumentDoc {
  title: string;
  type: 'policy' | 'report' | 'contract' | 'memo';
  uploadedBy: string;
  uploadedAt: Timestamp;
  fileUrl: string;
  size: string;
  department: string;
  tags?: string[];
}

export interface TimeTrackingDoc {
  staffId: string;
  date: Timestamp;
  clockIn: Timestamp;
  clockOut: Timestamp;
  hoursWorked: number;
  notes?: string;
  status: 'pending' | 'approved';
}

export interface LeaveRequestDoc {
  staffId: string;
  staffName: string;
  leaveType: 'annual' | 'sick' | 'unpaid' | 'maternity' | 'paternity';
  startDate: Timestamp;
  endDate: Timestamp;
  daysRequested: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
}

export interface PaymentDoc {
  staffId: string;
  staffName: string;
  amount: number;
  type: 'salary' | 'bonus' | 'reimbursement';
  date: Timestamp;
  status: 'paid' | 'pending' | 'failed';
  reference: string;
  description?: string;
}

export interface NotificationDoc {
  recipientId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: Timestamp;
  relatedTo?: { collection: string; docId: string };
}

export interface TrainingDoc {
  title: string;
  description?: string;
  assignedTo: string[];
  dueDate: Timestamp;
  status: 'not-started' | 'in-progress' | 'completed';
  completionRate: number;
  category: string;
  isMandatory: boolean;
  materials?: string[];
}

export interface AnnouncementDoc {
  title: string;
  body: string;
  postedBy: string;
  postedAt: Timestamp;
  priority: 'normal' | 'urgent';
  audienceRoles: string[];
}

// ─── Session / auth ───────────────────────────────────────────────────────────

export interface SessionPayload {
  uid: string;
  email: string;
  role: string;
}

// ─── Firestore doc with id helper ────────────────────────────────────────────

export type WithId<T> = T & { id: string };
