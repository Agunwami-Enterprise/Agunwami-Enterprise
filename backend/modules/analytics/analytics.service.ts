/**
 * Server-side CEO analytics aggregated from configured project endpoints and Firestore.
 */

import { listDocs } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';
import type { ProjectCardData, ProjectDepartment, ProjectTaskItem } from '../projects/projects.types';
import type {
  ActivityLogEntry,
  AnalyticsKpi,
  CeoAnalyticsPayload,
  DepartmentMetric,
  ExecutiveAnalytics,
  PerformanceMetricItem,
  StaffPerformanceItem,
  TaskListItem,
  TaskPriorityCount,
  TaskStatusCount,
} from './analytics.types';

const STATUS_COLORS: Record<string, string> = {
  Todo: '#9ca3af',
  'In Progress': '#3b82f6',
  'In Review': '#f5bd02',
  Completed: '#22c55e',
  Overdue: '#ef4444',
};

const PRIORITY_COLORS: Record<string, string> = {
  High: '#ef4444',
  Medium: '#8b5cf6',
  Low: '#84cc16',
};

function normalize(value: string | undefined): string {
  return (value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function taskStatus(task: ProjectTaskItem): string {
  const status = task.status.toLowerCase();
  if (['completed', 'approved', 'done', 'closed'].includes(status)) return 'Completed';
  if (['in review', 'submitted', 'review'].includes(status)) return 'In Review';
  if (['in progress', 'progress'].includes(status)) return 'In Progress';
  if (['overdue', 'expired'].includes(status)) return 'Overdue';
  return 'Todo';
}

function countStatuses(tasks: TaskListItem[]): Record<string, number> {
  const counts: Record<string, number> = {
    Todo: 0,
    'In Progress': 0,
    'In Review': 0,
    Completed: 0,
    Overdue: 0,
  };
  for (const task of tasks) {
    const status = task.status in counts ? task.status : 'Todo';
    counts[status]++;
  }
  return counts;
}

function projectTaskItems(projects: ProjectCardData[]): TaskListItem[] {
  return projects.flatMap((project) =>
    (project.tasks?.items || []).map((task) => ({
      ...task,
      id: `${project.id}:${task.id}`,
      status: taskStatus(task),
    })),
  );
}

function projectDepartments(projects: ProjectCardData[]): ProjectDepartment[] {
  const departments = new Map<string, ProjectDepartment>();
  for (const project of projects) {
    for (const department of project.departments || []) {
      const key = normalize(department.name);
      if (key && !departments.has(key)) departments.set(key, department);
    }
  }
  return Array.from(departments.values());
}

function taskCountsForProjects(projects: ProjectCardData[], items: TaskListItem[]) {
  const total = projects.reduce((sum, project) => sum + (project.tasks?.total ?? project.tasks?.items?.length ?? 0), 0);
  const completed = projects.reduce((sum, project) => sum + (project.tasks?.completed ?? 0), 0);
  const inProgress = projects.reduce((sum, project) => sum + (project.tasks?.inProgress ?? 0), 0);
  const inReview = projects.reduce((sum, project) => sum + (project.tasks?.inReview ?? 0), 0);
  const pending = projects.reduce((sum, project) => sum + (project.tasks?.pending ?? 0), 0);

  if (projects.some((project) => project.tasks)) {
    return { total, completed, inProgress, inReview, pending };
  }

  const counts = countStatuses(items);
  return {
    total: items.length,
    completed: counts.Completed,
    inProgress: counts['In Progress'],
    inReview: counts['In Review'],
    pending: counts.Todo + counts.Overdue,
  };
}

function makeStatusCounts(counts: Record<string, number>, total: number): TaskStatusCount[] {
  return Object.entries(STATUS_COLORS).map(([label, color]) => {
    const count = counts[label] || 0;
    return { label, count, color, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

function makePriorityCounts(tasks: TaskListItem[], projects: ProjectCardData[]): TaskPriorityCount[] {
  const supplied = projects.flatMap((project) => project.tasks?.byPriority || []);
  return Object.entries(PRIORITY_COLORS).map(([label, color]) => {
    const count = tasks.length
      ? tasks.filter((task) => task.priority.toLowerCase() === label.toLowerCase()).length
      : supplied.reduce((sum, item) => sum + (item.label.toLowerCase() === label.toLowerCase() ? item.count : 0), 0);
    const total = tasks.length || supplied.reduce((sum, item) => sum + item.count, 0);
    return { label, color, count, pct: total ? Math.round((count / total) * 100) : 0 };
  });
}

function activeStaff(user: Record<string, unknown>): boolean {
  const status = String(user.status || user.accountStatus || '').toLowerCase();
  return (user.role === 'staff' || user.isStaff === true) &&
    user.disabled !== true &&
    user.isDisabled !== true &&
    user.isDeleted !== true &&
    user.isFired !== true &&
    user.isSuspended !== true &&
    !['disabled', 'fired', 'inactive', 'suspended', 'terminated', 'deleted'].includes(status);
}

function matchesDepartment(department: string | undefined, selected: string): boolean {
  return selected === 'All Departments' || normalize(department) === normalize(selected);
}

export class AnalyticsService {
  static async getCeoAnalytics(
    selectedProjectId?: string,
    selectedDeptName?: string,
  ): Promise<CeoAnalyticsPayload> {
    const [projects, users] = await Promise.all([
      ProjectsService.getProjectsOverview(),
      listDocs('users', 500),
    ]);

    const selectedProject = selectedProjectId && selectedProjectId !== 'all'
      ? projects.find((project) => project.id === selectedProjectId)
      : undefined;
    const selectedProjects = selectedProject ? [selectedProject] : projects;
    const selectedDepartment = selectedDeptName && selectedDeptName !== 'all'
      ? selectedDeptName
      : 'All Departments';
    const departments = projectDepartments(selectedProjects);
    const taskItems = projectTaskItems(selectedProjects);
    const filteredTaskItems = selectedDepartment === 'All Departments'
      ? taskItems
      : taskItems.filter((task) => matchesDepartment(task.department, selectedDepartment));

    const taskCounts = selectedDepartment === 'All Departments'
      ? taskCountsForProjects(selectedProjects, taskItems)
      : (() => {
          const counts = countStatuses(filteredTaskItems);
          return {
            total: filteredTaskItems.length,
            completed: counts.Completed,
            inProgress: counts['In Progress'],
            inReview: counts['In Review'],
            pending: counts.Todo + counts.Overdue,
          };
        })();

    const statusCounts = selectedDepartment === 'All Departments' && taskItems.length === 0
      ? selectedProjects.flatMap((project) => project.tasks?.byStatus || []).reduce<Record<string, number>>((sum, item) => {
          sum[item.label] = (sum[item.label] || 0) + item.count;
          return sum;
        }, {})
      : countStatuses(filteredTaskItems);
    const tasksByStatus = makeStatusCounts(statusCounts, taskCounts.total);
    const tasksByPriority = makePriorityCounts(filteredTaskItems, selectedDepartment === 'All Departments' ? selectedProjects : []);

    const analytics = selectedProjects.flatMap((project) => project.analytics ? [project.analytics] : []);
    const staffDirectory = selectedProjects.flatMap((project) =>
      (project.staff || []).map((staff) => ({
        ...staff,
        project: project.name,
      })),
    ).filter((staff) => matchesDepartment(staff.department, selectedDepartment));
    const rawStaff = analytics.flatMap((item) => item.staffPerformance || [])
      .filter((staff) => matchesDepartment(staff.department, selectedDepartment));
    const staffPerf: StaffPerformanceItem[] = rawStaff.map((staff) => ({
      name: staff.name,
      productivity: staff.productivity,
      rating: typeof staff.rating === 'number'
        ? staff.rating
        : Number.parseFloat(String(staff.rating)) || 0,
      ...(staff.tasks !== undefined ? { tasks: staff.tasks } : {}),
      ...(staff.attendance !== undefined ? { attendance: staff.attendance } : {}),
      ...(staff.department ? { department: staff.department } : {}),
    }));
    const perfMetrics: PerformanceMetricItem[] = rawStaff.map((staff) => ({
      name: staff.name,
      tasks: staff.tasks,
      attendance: staff.attendance,
      rating: String(staff.rating),
      productivity: staff.productivity,
      ...(staff.department ? { department: staff.department } : {}),
    }));

    const departmentOptions = departments.map((department) => department.name);
    const selectedDepartmentMetrics = selectedDepartment === 'All Departments'
      ? departments
      : departments.filter((department) => normalize(department.name) === normalize(selectedDepartment));
    const departmentCompletion = selectedDepartmentMetrics
      .filter((department) => (department.tasksTotal || 0) > 0)
      .map((department) => ({
        label: department.name,
        pct: Math.round(((department.tasksCompleted || 0) / (department.tasksTotal || 1)) * 100),
      }));
    const maxHours = Math.max(0, ...selectedDepartmentMetrics.map((department) => department.hoursLogged || 0));
    const deptHours = selectedDepartmentMetrics
      .filter((department) => department.hoursLogged !== undefined)
      .map((department) => ({
        label: department.name,
        pct: maxHours ? Math.round(((department.hoursLogged || 0) / maxHours) * 100) : 0,
        sub: `${department.hoursLogged}h`,
      }));

    const staffCount = selectedProject
      ? selectedProject.staff !== undefined
        ? staffDirectory.length
        : departments.reduce((sum, department) => sum + department.headcount, 0)
      : users.filter(activeStaff).length;
    const performanceValues = rawStaff.map((staff) => staff.productivity).filter(Number.isFinite);
    const avgPerformance = performanceValues.length
      ? `${(performanceValues.reduce((sum, value) => sum + value, 0) / performanceValues.length).toFixed(1)}%`
      : '—';
    const revenueMetric = selectedProject?.metrics.find((metric) => /revenue/i.test(metric.label));
    const kpis: AnalyticsKpi = {
      totalRevenue: revenueMetric?.value || '—',
      totalRevenueSub: selectedProject ? selectedProject.name : 'Select a project for revenue',
      totalStaff: staffCount,
      totalStaffSub: 'Active staff',
      tasksCompleted: taskCounts.completed,
      tasksCompletedSub: taskCounts.total
        ? `${Math.round((taskCounts.completed / taskCounts.total) * 100)}% completion`
        : 'No task records',
      avgPerformance,
      avgPerformanceSub: performanceValues.length ? 'From project endpoint' : 'No performance data',
    };

    const activityLog: ActivityLogEntry[] = analytics.flatMap((item) => item.recentActivities || []);
    const projectOptions = [
      { id: 'all', name: 'All Projects' },
      ...projects.map((project) => ({ id: project.id, name: project.name })),
    ];
    const projectAnalytics = selectedProject?.analytics;
    const radarData = projectAnalytics?.departmentPerformance;
    const departmentPerformance = selectedDepartmentMetrics;
    const radarAxes = radarData?.axes || departmentPerformance.map((department) => department.name);
    const derivedRadarSeries = [
      {
        label: 'Productivity',
        color: '#22c55e',
        values: departmentPerformance.map((department) => department.productivity),
      },
      {
        label: 'Efficiency',
        color: '#3b82f6',
        values: departmentPerformance.map((department) => department.efficiency),
      },
      {
        label: 'Engagement',
        color: '#f5bd02',
        values: departmentPerformance.map((department) => department.engagement),
      },
    ];
    const radarSeries = radarData?.series || derivedRadarSeries
      .filter((series) => series.values.some((value) => value !== undefined))
      .map((series) => ({
        label: series.label,
        color: series.color,
        fracs: series.values.map((value) => Math.max(0, Math.min(100, value || 0)) / 100),
      }));

    return {
      kpis,
      projects: projectOptions,
      departments: departmentOptions,
      activityLog,
      staffDirectory,
      staffPerf,
      perfMetrics,
      radar: { axes: radarAxes, series: radarSeries },
      staffTimeline: projectAnalytics?.staffTimeline || { months: [], active: [], onLeave: [] },
      monthlyFinance: analytics.flatMap((item) => item.monthlyFinance || []),
      expenseBreakdown: analytics.flatMap((item) => item.expenseBreakdown || []),
      tasksByStatus,
      tasksByPriority,
      taskItems: filteredTaskItems,
      trainingCompliance: analytics.flatMap((item) => item.trainingCompliance || []),
      deptCompletion: departmentCompletion,
      deptHours,
      punctuality: projectAnalytics?.timeRecords?.punctuality || [],
      metadata: {
        selectedProject: selectedProject?.id || 'all',
        selectedDepartment,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  }

  static async getExecutiveAnalytics(): Promise<ExecutiveAnalytics> {
    const [users, attendance, courses, payments, leaveRequests, staffTasks] = await Promise.all([
      listDocs('users', 500),
      listDocs('attendanceLogs', 500),
      listDocs('courses', 500),
      listDocs('payments', 500),
      listDocs('leaveRequests', 500),
      listDocs('staffTasks', 500),
    ]);
    const today = new Date().toISOString().slice(0, 10);
    const staff = users.filter(activeStaff);
    const todayAttendance = attendance.filter((record) =>
      record.dateKey === today || record._createTime?.startsWith(today),
    );
    const completedTasks = staffTasks.filter((task) =>
      ['completed', 'approved', 'done'].includes(String(task.stage || task.status || '').toLowerCase()),
    ).length;
    const totalTasks = staffTasks.length;
    const pendingLeaves = leaveRequests.filter((request) =>
      String(request.status || '').toLowerCase() === 'pending',
    ).length;
    const pendingPayments = payments.filter((payment) =>
      String(payment.status || '').toLowerCase() === 'pending',
    ).length;
    const hoursByDay = new Map<string, number>();
    for (const record of attendance) {
      const date = new Date(String(record.dateKey || record.clockInTime || record._createTime || ''));
      if (!Number.isNaN(date.getTime())) {
        const day = date.toLocaleDateString('en-US', { weekday: 'short' });
        hoursByDay.set(day, (hoursByDay.get(day) || 0) + (Number(record.totalHours) || 0));
      }
    }
    const activeStaffToday = todayAttendance.filter((record) =>
      record.status === 'Clocked In' || (!record.clockOutTime && record.clockInTime),
    ).length;
    const totalHoursToday = todayAttendance.reduce((sum, record) => sum + (Number(record.totalHours) || 0), 0);

    return {
      workforce: {
        totalStaff: staff.length,
        activeStaffToday,
        attendanceRate: staff.length ? Math.round((activeStaffToday / staff.length) * 100) : 0,
        avgDailyHours: activeStaffToday ? Math.round((totalHoursToday / activeStaffToday) * 10) / 10 : 0,
      },
      tasks: {
        totalTasks,
        completedTasks,
        pendingTasks: totalTasks - completedTasks,
        completionRate: totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0,
      },
      ventures: {
        aeHubHealth: null,
        aeHubRevenueNGN: payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0),
        aeHubStudents: users.filter((user) => user.role === 'student').length,
        aeHubActiveCourses: courses.filter((course) =>
          String(course.visibility || '').toLowerCase() === 'published' ||
          String(course.status || '').toLowerCase() === 'published',
        ).length,
      },
      approvals: {
        pendingLeaves,
        pendingPayments,
        totalPending: pendingLeaves + pendingPayments,
      },
      weeklyAttendance: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => ({
        day,
        hours: Math.round((hoursByDay.get(day) || 0) * 10) / 10,
      })),
    };
  }

  static async getDepartmentMetrics(): Promise<DepartmentMetric[]> {
    const projects = await ProjectsService.getProjectsOverview();
    return projectDepartments(projects).map((department) => ({
      department: department.name,
      headcount: department.headcount,
      tasksCompleted: department.tasksCompleted || 0,
      tasksPending: department.tasksPending || 0,
      attendanceRate: department.attendanceRate ?? null,
    }));
  }
}
