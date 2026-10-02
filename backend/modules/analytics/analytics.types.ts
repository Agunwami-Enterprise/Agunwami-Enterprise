/**
 * backend/modules/analytics/analytics.types.ts
 *
 * Types for CEO Enterprise Analytics.
 */

export interface ExecutiveAnalytics {
  workforce: {
    totalStaff: number;
    activeStaffToday: number;
    attendanceRate: number;
    avgDailyHours: number;
  };
  tasks: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    completionRate: number;
  };
  ventures: {
    aeHubHealth: number | null;
    aeHubRevenueNGN: number;
    aeHubStudents: number;
    aeHubActiveCourses: number;
  };
  approvals: {
    pendingLeaves: number;
    pendingPayments: number;
    totalPending: number;
  };
  weeklyAttendance: Array<{ day: string; hours: number }>;
}

export interface DepartmentMetric {
  department: string;
  headcount: number;
  tasksCompleted: number;
  tasksPending: number;
  attendanceRate: number | null;
}

export interface AnalyticsKpi {
  totalRevenue: string;
  totalRevenueSub: string;
  totalStaff: number | string;
  totalStaffSub: string;
  tasksCompleted: number | string;
  tasksCompletedSub: string;
  avgPerformance: string;
  avgPerformanceSub: string;
}

export interface ActivityLogEntry {
  name: string;
  action: string;
  detail: string;
  time: string;
  iconBg?: string;
  initials?: string;
  color?: string;
}

export interface StaffPerformanceItem {
  name: string;
  productivity: number;
  rating: number;
  tasks?: number;
  attendance?: number;
  department?: string;
}

export interface PerformanceMetricItem {
  name: string;
  tasks: number;
  attendance: number;
  rating: string;
  productivity: number;
  department?: string;
}

export interface StaffDirectoryItem {
  id: string;
  name: string;
  project: string;
  department?: string;
  role?: string;
  status?: string;
}

export interface DepartmentRadarData {
  axes: string[];
  series: Array<{ label: string; color: string; fracs: number[] }>;
}

export interface StaffTimelineData {
  months: string[];
  active: number[];
  onLeave: number[];
}

export interface MonthlyFinanceItem {
  month: string;
  revenue: number;
  expenses: number;
}

export interface ExpenseBreakdownItem {
  label: string;
  pct: number;
  color: string;
  amount?: number;
}

export interface TaskStatusCount {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface TaskPriorityCount {
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface TaskListItem {
  id: string;
  task: string;
  assignee?: string;
  department?: string;
  dueDate?: string;
  status: string;
  priority: string;
}

export interface TrainingComplianceItem {
  label: string;
  pct: number;
  mandatory: boolean;
}

export interface DeptCompletionItem {
  label: string;
  pct: number;
  color?: string;
}

export interface DeptHoursItem {
  label: string;
  pct: number;
  sub: string;
  color?: string;
}

export interface PunctualityItem {
  label: string;
  pct: number;
  color?: string;
}

export interface CeoAnalyticsPayload {
  kpis: AnalyticsKpi;
  projects: Array<{ id: string; name: string }>;
  departments: string[];
  activityLog: ActivityLogEntry[];
  staffDirectory: StaffDirectoryItem[];
  staffPerf: StaffPerformanceItem[];
  perfMetrics: PerformanceMetricItem[];
  radar: DepartmentRadarData;
  staffTimeline: StaffTimelineData;
  monthlyFinance: MonthlyFinanceItem[];
  expenseBreakdown: ExpenseBreakdownItem[];
  tasksByStatus: TaskStatusCount[];
  tasksByPriority: TaskPriorityCount[];
  taskItems: TaskListItem[];
  trainingCompliance: TrainingComplianceItem[];
  deptCompletion: DeptCompletionItem[];
  deptHours: DeptHoursItem[];
  punctuality: PunctualityItem[];
  metadata: {
    selectedProject: string;
    selectedDepartment: string;
    lastSyncedAt: string;
  };
}
