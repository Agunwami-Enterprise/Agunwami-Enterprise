/**
 * backend/modules/projects/projects.types.ts
 *
 * Types for enterprise project records and dashboard views.
 */

export interface ProjectCardMetric {
  label: string;
  value: string | null;
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
  endpointError?: string;
  revenueTrend?: ProjectMonthlyRevenue[];
  approvals?: ProjectApprovalItem[];
  activity?: ProjectActivityItem[];
  staff?: ProjectStaffMember[];
  departments?: ProjectDepartment[];
  tasks?: ProjectTasksSummary;
  leaveRequests?: ProjectLeaveRequest[];
  analytics?: ProjectAnalyticsData;
  lastSyncedAt?: string;
}

export interface CreateProjectDto {
  name: string;
  subtitle: string;
  description?: string;
  lead?: string;
  adminUrl?: string;
  apiEndpoint?: string;
  apiToken?: string;
  color?: string;
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
}
