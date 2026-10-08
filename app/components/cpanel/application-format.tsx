import type { ApplicationStatus, PartnershipApplication } from '@/backend/modules/site-content/site-content.types';

/** Usable from server and client components. */

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  reviewed: 'bg-blue-50 text-blue-700',
  approved: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-700',
};

export const statusLabel = (status: string) => status[0].toUpperCase() + status.slice(1);

export const applicantName = (a: PartnershipApplication) => `${a.firstName} ${a.lastName}`.trim() || a.email;

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={`rounded-md px-2 py-0.5 text-[12px] font-semibold ${STATUS_STYLES[status]}`}>{statusLabel(status)}</span>;
}
