/**
 * backend/services/approvals.service.ts
 *
 * Re-exports approvals services from backend/modules/dashboard.
 */

export { getApprovals as getPendingApprovals } from '../modules/dashboard/dashboard.service';
export type { ApprovalItem } from '../modules/dashboard/dashboard.types';
