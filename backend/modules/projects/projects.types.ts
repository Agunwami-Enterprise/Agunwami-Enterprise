/**
 * backend/modules/projects/projects.types.ts
 *
 * Types for enterprise project records and dashboard views.
 */

export interface ProjectCardMetric {
  label: string;
  value: string | null;
  /** Optional line under the value, e.g. "+5.3% vs June". */
  hint?: string;
  /** Arrow next to the hint. */
  trend?: 'up' | 'down';
}

/** A ranked bar chart a project chooses, e.g. "Top 5 Selling Products". */
export interface ProjectTopItems {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: number }>;
}

export type ProjectNotificationCategory = 'tasks' | 'updates' | 'payments' | 'messages';

/** A project-wide event a project reports through its metrics endpoint. */
export interface ProjectNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: ProjectNotificationCategory;
  /** ISO time. */
  createdAt: string;
  priority?: 'high' | 'medium' | 'low';
  /** Absolute link into the project, if it has one. */
  link?: string;
}

/** A project notification with the project it came from (for merged lists). */
export interface ProjectNotificationItem extends ProjectNotification {
  projectId: string;
  projectName: string;
  projectColor: string;
}

/* ── Optional page feeds: timeTracking, documents, payments, training ─────── */

export type ProjectAttendanceStatus = 'Clocked in' | 'Clocked out' | 'On leave' | 'Not clocked in';

export interface ProjectAttendanceEntry {
  id: string;
  name: string;
  department?: string;
  status: ProjectAttendanceStatus;
  /** ISO times; clockOut is null while clocked in. */
  clockIn: string | null;
  clockOut: string | null;
  hoursToday: number;
}

/** Optional `timeTracking`: today's attendance in the project. */
export interface ProjectTimeTracking {
  /** The project's local date, YYYY-MM-DD. */
  date: string;
  activeStaff: number;
  clockedIn: number;
  clockedOut: number;
  onLeave: number;
  notClockedIn: number;
  hoursToday: number;
  staff: ProjectAttendanceEntry[];
  hoursByDay: Array<{ date: string; hours: number }>;
}

/** Optional `documents`: the project's documents, newest first. */
export interface ProjectDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  department?: string;
  uploadedBy?: string;
  size?: string;
  /** http(s) download link, if the project shares one. */
  url?: string;
  createdAt: string | null;
}

/** Optional `payments`: money in and out of the project, newest first. */
export interface ProjectPayment {
  id: string;
  reference?: string;
  description: string;
  party?: string;
  amount: number;
  currency: string;
  direction: 'incoming' | 'outgoing';
  category: string;
  status: string;
  createdAt: string | null;
}

/** Optional `training`: the project's courses or training programs. */
export interface ProjectTrainingCourse {
  id: string;
  title: string;
  category: string;
  level?: string;
  instructor?: string;
  duration?: string;
  hours: number;
  status: string;
  learners: number;
  completionRate: number;
  modules: number;
}

export type ProjectFeedKey = 'timeTracking' | 'documents' | 'payments' | 'training';

/** Who an item in a merged list belongs to: the enterprise itself or a project. */
export interface FeedSource {
  id: string;
  name: string;
  color: string;
  kind: 'enterprise' | 'project';
}

/** How each project fared when building a merged list. */
export interface ProjectFeedStatus extends FeedSource {
  /** The project's endpoint failed and nothing could be shown. */
  error?: string;
  /** The endpoint answered but doesn't send this section yet. */
  missing?: boolean;
  /** The endpoint failed; the last successful sync is shown. */
  stale?: boolean;
  lastSyncedAt?: string;
}

export const ENTERPRISE_SOURCE: FeedSource = {
  id: 'enterprise',
  name: 'Agunwami Enterprise',
  color: '#C89B3C',
  kind: 'enterprise',
};

export type ProjectRecordTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

/** A small table a project chooses, e.g. "Recent Orders". */
export interface ProjectRecordsTable {
  title: string;
  columns: string[];
  rows: Array<{ cells: string[]; status?: string; tone?: ProjectRecordTone }>;
}

export interface ProjectMonthlyRevenue {
  month: string;
  revenue: number;
}

export interface ProjectLeaveRequest {
  id: string;
  projectId: string;
  project: string;
  userId: string;
  employeeName: string;
  employeeEmail?: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  reason?: string;
  appliedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface ProjectActivityItem {
  id: string;
  text: string;
  time: string | null;
  type: 'announcement' | 'task' | 'leave' | 'payment' | 'course';
}

export interface ProjectStaffMember {
  id: string;
  name: string;
  department?: string;
  role?: string;
  status?: string;
}

export interface ProjectTaskCreatePayload {
  kind: 'task' | 'sprint';
  title: string;
  description: string;
  department: string;
  assigneeUid?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  priority: string;
  startDate?: string;
  dueDate: string;
  tags?: string[];
  subTasks?: Array<{
    title: string;
    description?: string;
    date: string;
    priority: string;
  }>;
  createdBy: string;
  createdByName: string;
  projectId: string;
  projectName: string;
}

export interface EnterpriseProjectDoc {
  id: string;
  name: string;
  subtitle: string;
  description?: string;
  lead?: string;
  adminUrl?: string | null;
  apiEndpoint?: string | null;
  color?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectApprovalItem {
  id: string;
  title: string;
  project: string;
  urgent: boolean;
  subtitle: string;
  details: string;
  type: 'leave' | 'payment' | 'task' | 'staff';
  sourceCollection: string;
  createdAt: string | null;
  status?: string;
}

export interface ProjectDepartment {
  id: string;
  name: string;
  headcount: number;
  staff?: ProjectStaffMember[];
  tasksTotal?: number;
  tasksCompleted?: number;
  tasksPending?: number;
  hoursLogged?: number;
  attendanceRate?: number;
  productivity?: number;
  efficiency?: number;
  engagement?: number;
}

export interface ProjectTaskItem {
  id: string;
  task: string;
  assignee?: string;
  department?: string;
  dueDate?: string;
  status: 'Todo' | 'In Progress' | 'In Review' | 'Completed' | 'Pending' | 'Overdue';
  priority: 'High' | 'Medium' | 'Low';
}

export interface ProjectTasksSummary {
  total: number;
  completed: number;
  inProgress: number;
  inReview?: number;
  pending?: number;
  completionRate?: number;
  byStatus?: Array<{ label: string; count: number; pct: number; color?: string }>;
  byPriority?: Array<{ label: string; count: number; pct: number; color?: string }>;
  items?: ProjectTaskItem[];
}

export interface ProjectAnalyticsData {
  staffPerformance?: Array<{
    name: string;
    department?: string;
    tasks: number;
    attendance: number;
    rating: string | number;
    productivity: number;
  }>;
  departmentPerformance?: {
    axes: string[];
    series: Array<{ label: string; color: string; fracs: number[] }>;
  };
  staffTimeline?: {
    months: string[];
    active: number[];
    onLeave: number[];
  };
  monthlyFinance?: Array<{ month: string; revenue: number; expenses: number }>;
  expenseBreakdown?: Array<{ label: string; pct: number; color: string; amount?: number }>;
  trainingCompliance?: Array<{ label: string; pct: number; mandatory: boolean }>;
  timeRecords?: {
    departmentHours: Array<{ label: string; pct: number; sub: string }>;
    punctuality: Array<{ label: string; pct: number }>;
  };
  recentActivities?: Array<{
    name: string;
    action: string;
    detail: string;
    time: string;
    initials?: string;
    color?: string;
  }>;
}

export interface ProjectCardData {
  id: string;
  name: string;
  subtitle: string;
  description?: string;
  lead?: string;
  adminUrl: string | null;
  apiEndpoint: string | null;
  hasApiToken?: boolean;
  color?: string;
  metrics: ProjectCardMetric[];
  health: number | null;
  status: 'online' | 'pending' | 'error';
  /** True when the endpoint failed and the card shows the last successful sync. */
  stale?: boolean;
  endpointError?: string;
  revenueTrend?: ProjectMonthlyRevenue[];
  approvals?: ProjectApprovalItem[];
  activity?: ProjectActivityItem[];
  staff?: ProjectStaffMember[];
  departments?: ProjectDepartment[];
  tasks?: ProjectTasksSummary;
  leaveRequests?: ProjectLeaveRequest[];
  analytics?: ProjectAnalyticsData;
  topItems?: ProjectTopItems;
  recentRecords?: ProjectRecordsTable;
  notifications?: ProjectNotification[];
  timeTracking?: ProjectTimeTracking;
  documents?: ProjectDocument[];
  payments?: ProjectPayment[];
  training?: ProjectTrainingCourse[];
  lastSyncedAt?: string;
}

export interface CreateProjectDto {
  name: string;
  subtitle: string;
  description?: string;
  lead?: string;
  adminUrl?: string;
  /** Required from the CEO dashboard; optional for projects created in the website C-panel. */
  apiEndpoint?: string;
  apiToken?: string;
  color?: string;
  /** Public website content, edited in the C-panel (see backend/modules/site-content). */
  website?: Record<string, unknown>;
}

export interface UpdateProjectDto {
  name?: string;
  subtitle?: string;
  description?: string;
  lead?: string;
  adminUrl?: string;
  apiEndpoint?: string;
  apiToken?: string;
  clearApiToken?: boolean;
  color?: string;
  website?: Record<string, unknown>;
}
