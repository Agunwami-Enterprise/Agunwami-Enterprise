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
  status: 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  notes?: string;
}
