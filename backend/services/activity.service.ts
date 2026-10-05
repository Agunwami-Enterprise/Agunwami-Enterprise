/**
 * backend/services/activity.service.ts
 *
 * Re-exports activity feed services from backend/modules/dashboard.
 */

export { getActivityFeed } from '../modules/dashboard/dashboard.service';
export type { ActivityItem } from '../modules/dashboard/dashboard.types';
