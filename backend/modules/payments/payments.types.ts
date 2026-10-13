/**
 * backend/modules/payments/payments.types.ts
 *
 * Types for CEO Payments & Financial Management.
 */

export type PaymentStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'FAILED';
export type PaymentCategory = 'Payroll' | 'Vendor' | 'Operations' | 'Course Fee' | 'Refund' | 'Other';

export interface PaymentRecord {
  id: string;
  reference: string;
  recipientName: string;
  recipientEmail?: string;
  amount: number;
  currency: string;
  category: PaymentCategory;
  status: PaymentStatus;
  description: string;
  requestedBy: string;
  approvedBy?: string;
  createdAt: string;
  processedAt?: string;
}

export interface PaymentStats {
  totalVolumeNGN: number;
  pendingApprovalsCount: number;
  pendingAmountNGN: number;
  completedCount: number;
  completedAmountNGN: number;
  currency: string;
}

export interface PaymentFilter {
  status?: PaymentStatus;
  category?: PaymentCategory;
  search?: string;
  limit?: number;
}

export interface ApprovePaymentDto {
  status: 'APPROVED' | 'REJECTED' | 'COMPLETED';
  approvedBy?: string;
  notes?: string;
}

export const PAYMENT_TYPES = ['incoming', 'outgoing', 'payroll', 'refund'] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];
export const PAYMENT_CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'] as const;

/** A payment the CEO records from the Payments page. */
export interface NewPaymentDto {
  type: PaymentType;
  amount: number;
  currency: string;
  category: string;
  description: string;
  /** Who paid (incoming) or who is paid (everything else). */
  party: string;
  /** Already paid or received, or still to be approved and paid. */
  status: 'COMPLETED' | 'PENDING';
  /** ISO date of the payment; today when left out. */
  date?: string;
}
