/**
 * backend/modules/payments/payments.feed.ts
 *
 * The CEO Payments page list: the enterprise's own `payments` records plus
 * every project's `payments` feed, each labelled with where it came from.
 */

import { getAdminAuthToken, listDocs } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';
import { ENTERPRISE_SOURCE, type FeedSource, type ProjectFeedStatus } from '../projects/projects.types';
import { ENTERPRISE_READ_ERROR, isoOf, text, type RawRecord } from '../projects/feed-helpers';

export type PaymentFeedType = 'Incoming' | 'Outgoing' | 'Payroll' | 'Refund';
export type PaymentFeedStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Failed';

export interface PaymentFeedItem {
  /** Unique across sources. */
  key: string;
  id: string;
  source: FeedSource;
  amount: number;
  currency: string;
  type: PaymentFeedType;
  status: PaymentFeedStatus;
  category: string;
  description: string;
  reference?: string;
  requestedBy: string;
  approvedBy: string;
  /** ISO times or null. */
  created: string | null;
  processed: string | null;
  /** Only the enterprise's own pending payments can be approved here. */
  reviewable: boolean;
}

export interface PaymentsFeed {
  items: PaymentFeedItem[];
  projects: ProjectFeedStatus[];
  enterpriseError?: string;
}

type Raw = RawRecord;

export function normalizePaymentStatus(value: unknown): PaymentFeedStatus {
  const status = text(value).toLowerCase();
  if (['completed', 'paid', 'success', 'successful', 'processed', 'cleared', 'provisioned'].includes(status)) return 'Completed';
  if (status === 'approved') return 'Approved';
  if (['rejected', 'declined', 'cancelled', 'canceled'].includes(status)) return 'Rejected';
  if (['failed', 'reversed', 'error'].includes(status)) return 'Failed';
  return 'Pending';
}

function enterpriseType(raw: Raw): PaymentFeedType {
  const value = `${text(raw.type)} ${text(raw.category)}`.toLowerCase();
  if (/refund/.test(value)) return 'Refund';
  if (/salary|payroll|bonus|stipend/.test(value)) return 'Payroll';
  if (/incoming|income|revenue|deposit/.test(value)) return 'Incoming';
  return 'Outgoing';
}

function enterpriseItem(raw: Raw): PaymentFeedItem {
  const id = text(raw._id) || text(raw.id);
  const status = normalizePaymentStatus(raw.status);
  const created = isoOf(raw.createdAt) ?? isoOf(raw.date) ?? isoOf(raw._createTime);
  return {
    key: `${ENTERPRISE_SOURCE.id}:${id}`,
    id,
    source: ENTERPRISE_SOURCE,
    amount: Math.abs(Number(raw.amount) || 0),
    currency: (text(raw.currency) || 'NGN').toUpperCase(),
    type: enterpriseType(raw),
    status,
    category: text(raw.category) || text(raw.purpose) || text(raw.type) || 'Payment',
    description: text(raw.description) || text(raw.purpose) || 'Enterprise payment',
    ...(text(raw.reference) ? { reference: text(raw.reference) } : {}),
    requestedBy: text(raw.staffName) || text(raw.requestedBy) || text(raw.recipientName) || '-',
    approvedBy: text(raw.approvedBy) || '-',
    created,
    processed: isoOf(raw.processedAt) ?? isoOf(raw.approvedAt) ?? (status === 'Completed' ? created : null),
    reviewable: status === 'Pending',
  };
}

export async function getPaymentsFeed(): Promise<PaymentsFeed> {
  const [token, projectFeed] = await Promise.all([
    getAdminAuthToken().catch(() => null),
    ProjectsService.getProjectFeed('payments'),
  ]);
  const enterpriseDocs = token ? await listDocs('payments', 300).catch(() => []) : [];

  const items: PaymentFeedItem[] = [
    ...enterpriseDocs.map(doc => enterpriseItem(doc as Raw)),
    ...projectFeed.entries.flatMap(({ source, data }) => data.map(payment => {
      const status = normalizePaymentStatus(payment.status);
      const category = payment.category;
      const type: PaymentFeedType = /refund/i.test(category)
        ? 'Refund'
        : payment.direction === 'incoming'
          ? 'Incoming'
          : /salary|payroll|stipend/i.test(category) ? 'Payroll' : 'Outgoing';
      return {
        key: `${source.id}:${payment.id}`,
        id: payment.id,
        source,
        amount: payment.amount,
        currency: payment.currency,
        type,
        status,
        category,
        description: payment.description,
        ...(payment.reference ? { reference: payment.reference } : {}),
        requestedBy: payment.party || '-',
        approvedBy: '-',
        created: payment.createdAt,
        processed: status === 'Completed' ? payment.createdAt : null,
        reviewable: false,
      } satisfies PaymentFeedItem;
    })),
  ].sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''));

  return {
    items,
    projects: projectFeed.projects,
    ...(token ? {} : { enterpriseError: ENTERPRISE_READ_ERROR }),
  };
}
