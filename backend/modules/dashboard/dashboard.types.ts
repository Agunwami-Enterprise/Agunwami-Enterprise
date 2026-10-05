/**
 * backend/modules/dashboard/dashboard.types.ts
 *
 * Types for the CEO Overview Dashboard page.
 */

import type { ProjectCardMetric, ProjectCardData } from '../projects/projects.types';

export type { ProjectCardMetric, ProjectCardData };

export interface OverviewStats {
  totalStaff:         number | null;
  activeStaff:        number | null;
  clockedInStaff:     number | null;
  tasksTotal:         number | null;
  tasksDone:          number | null;
  pendingApprovals:   number | null;
  announcementsCount: number | null;
}

export interface FeedItem {
  id: string;
  project: string;
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
  [projectId: string]: number | string | null | undefined;
}

export interface RevenueTrendData {
  months: RevenueMonth[];
  combinedRevenue: string | null;
}

export type RevenueTrend = RevenueTrendData;
