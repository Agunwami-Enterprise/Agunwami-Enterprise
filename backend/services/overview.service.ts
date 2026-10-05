/**
 * backend/services/overview.service.ts
 *
 * Re-exports overview services from backend/modules/dashboard.
 */

export { getOverview as getOverviewMetrics } from '../modules/dashboard/dashboard.service';
export type { OverviewStats as OverviewMetrics } from '../modules/dashboard/dashboard.types';
