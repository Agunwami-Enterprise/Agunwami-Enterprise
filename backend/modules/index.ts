/**
 * backend/modules/index.ts
 *
 * Central export of all backend domain modules.
 * Individual modules are also accessible as namespaces (e.g. DashboardModule, TasksModule).
 */

// 1. Dashboard (Overview)
export * as DashboardModule from './dashboard';
export {
  DashboardService,
  getOverview,
  getProjects,
  getActivityFeed,
  getApprovals,
  getRevenue,
} from './dashboard';
export type {
  OverviewStats,
  FeedItem,
  ActivityItem,
  ApprovalItem,
  RevenueMonth,
  RevenueTrendData,
  RevenueTrend,
} from './dashboard';

// 2. Projects & Ventures
export * as ProjectsModule from './projects';
export {
  ProjectsService,
  getProjectsOverview,

} from './projects';
export type {
  ProjectCardMetric,
  ProjectCardData,
  AeHubDetailedProject,
} from './projects';

// 3. Tasks Management
export * as TasksModule from './tasks';
export { TasksService } from './tasks';
export type {
  TaskItem,
  TaskSummaryStats,
  TaskFilterOptions,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskPriority,
  TaskStage,
} from './tasks';

// 4. Time Tracking & Attendance
export * as TimeTrackingModule from './time-tracking';
export { TimeTrackingService } from './time-tracking';
export type {
  AttendanceRecord,
  TimeTrackingSummary,
  DepartmentAttendance,
  TimeTrackingFilter,
} from './time-tracking';

// 5. Staff Management
export * as StaffModule from './staff';
export { StaffService } from './staff';
export type {
  StaffMember,
  StaffStats,
  StaffFilter,
  StaffStatus,
  ClockStatus,
} from './staff';

// 6. Leave Requests
export * as LeaveRequestsModule from './leave-requests';
export { LeaveRequestsService } from './leave-requests';
export type {
  LeaveRequestItem,
  LeaveSummaryStats,
  LeaveApprovalDto,
  LeaveStatus,
  LeaveType,
} from './leave-requests';

// 7. Payments & Financials
export * as PaymentsModule from './payments';
export { PaymentsService } from './payments';
export type {
  PaymentRecord,
  PaymentStats,
  PaymentFilter,
  ApprovePaymentDto,
  PaymentStatus,
  PaymentCategory,
} from './payments';

// 8. Enterprise Analytics
export * as AnalyticsModule from './analytics';
export { AnalyticsService } from './analytics';
export type {
  ExecutiveAnalytics,
  DepartmentMetric,
} from './analytics';

// 9. Corporate Documents
export * as DocumentsModule from './documents';
export { DocumentsService } from './documents';
export type {
  CorporateDocument,
  DocumentCategory,
  DocumentFilter,
  CreateDocumentDto,
} from './documents';

// 10. Notifications & Announcements
export * as NotificationsModule from './notifications';
export { NotificationsService } from './notifications';
export type {
  AnnouncementItem,
  ExecutiveNotification,
  BroadcastAnnouncementDto,
  NotificationPriority,
} from './notifications';

// 11. Training & Courses
export * as TrainingModule from './training';
export { TrainingService } from './training';
export type {
  CourseItem,
  TrainingSummaryStats,
} from './training';

// 12. Messages & Communications
export * as MessagesModule from './messages';
export { MessagesService } from './messages';
export type {
  ChatChannel,
  ChatMessage,
  SendMessageDto,
} from './messages';

// 13. Settings & Configuration
export * as SettingsModule from './settings';
export { SettingsService } from './settings';
export type {
  ExecutiveProfile,
  EnterpriseSettings,
  UpdateProfileDto,
} from './settings';
