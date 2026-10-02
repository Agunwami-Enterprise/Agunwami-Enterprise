/**
 * backend/services/revenue.service.ts
 *
 * Re-exports revenue services from backend/modules/dashboard.
 */

export { getRevenue as getRevenueTrend } from '../modules/dashboard/dashboard.service';
export type { RevenueTrend } from '../modules/dashboard/dashboard.types';
