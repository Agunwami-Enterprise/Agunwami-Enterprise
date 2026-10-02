/**
 * backend/modules/dashboard/dashboard.types.ts
 *
 * Types for the CEO Overview Dashboard page.
 */

import type { ProjectCardMetric, ProjectCardData } from '../projects/projects.types';

export type { ProjectCardMetric, ProjectCardData };

export interface OverviewStats {
  totalStaff:         number;
  activeStaff:        number;
  clockedInStaff?:    number;
  tasksTotal:         number;
  tasksDone:          number;
  pendingApprovals:   number;
  announcementsCount: number;
  aeHubHealth:        number;
}

export interface FeedItem {
  id: string;
  project: 'AE Hub' | 'MCS' | 'AWA' | 'Trendora' | 'Enterprise';
  time: string;
  text: string;
  type: 'announcement' | 'task' | 'leave' | 'payment' | 'course';
  _ts: number;
}

export type ActivityItem = FeedItem;

export interface ApprovalItem {
  id: string;
  title: string;
  project: string;
  urgent: boolean;
  subtitle: string;
  details: string;
  type: 'leave' | 'payment' | 'task' | 'staff';
  sourceCollection: string;
  createdAt: string | null;
}

export interface RevenueMonth {
  month: string;
  aeHub?: number | null;
  mcs?: number | null;
  awa?: number | null;
  trendora?: number | null;
  [projectId: string]: number | string | null | undefined;
}

export interface RevenueTrendData {
  months: RevenueMonth[];
  combinedRevenue: string | null;
}

export type RevenueTrend = RevenueTrendData;
