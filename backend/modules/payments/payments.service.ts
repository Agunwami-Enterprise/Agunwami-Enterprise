/**
 * backend/modules/payments/payments.service.ts
 *
 * Server-side Payments Service.
 * Fetches real financial vouchers and transactions from AEHub Firestore payments collection.
 */

import { listDocs, getDoc, updateDoc } from '../../core/firestore';
import type {
  PaymentRecord,
  PaymentStats,
  PaymentFilter,
  ApprovePaymentDto,
  PaymentStatus,
  PaymentCategory,
} from './payments.types';

export class PaymentsService {
  /**
   * Aggregated financial stats for CEO Payments page.
   */
  static async getPaymentStats(): Promise<PaymentStats> {
    const paymentDocs = await listDocs('payments', 100).catch(() => []);

    let totalVolume = 0;
    let pendingCount = 0;
    let pendingAmount = 0;
    let completedCount = 0;
    let completedAmount = 0;

    paymentDocs.forEach(p => {
      const amt = Number(p.amount) || 0;
      totalVolume += amt;
      const status = String(p.status || '').toUpperCase();

      if (status === 'PENDING') {
        pendingCount++;
        pendingAmount += amt;
      } else if (status === 'COMPLETED' || status === 'APPROVED') {
        completedCount++;
        completedAmount += amt;
      }
    });

    return {
      totalVolumeNGN: totalVolume,
      pendingApprovalsCount: pendingCount,
      pendingAmountNGN: pendingAmount,
      completedCount,
      completedAmountNGN: completedAmount,
      currency: 'NGN',
    };
  }

  /**
   * Lists payments with optional status and category filters.
   */
  static async getPayments(filter: PaymentFilter = {}): Promise<PaymentRecord[]> {
    const paymentDocs = await listDocs('payments', filter.limit || 50).catch(() => []);

    let records: PaymentRecord[] = paymentDocs.map(doc => {
      const status = (String(doc.status || 'PENDING').toUpperCase()) as PaymentStatus;
      const category = (doc.category || doc.purpose || 'Operations') as PaymentCategory;

      return {
        id: doc._id,
        reference: doc.reference || doc.paymentId || doc._id.toUpperCase(),
        recipientName: doc.recipientName || doc.userName || doc.requestedBy || 'Recipient',
        recipientEmail: doc.recipientEmail || doc.userEmail,
        amount: Number(doc.amount) || 0,
        currency: doc.currency || 'NGN',
        category,
        status,
        description: doc.description || doc.purpose || 'Enterprise payment voucher',
        requestedBy: doc.requestedBy || 'Finance Dept',
        approvedBy: doc.approvedBy,
        createdAt: doc.createdAt || doc._createTime || '',
        processedAt: doc.processedAt,
      };
    });

    if (filter.status) {
      records = records.filter(r => r.status === filter.status);
    }
    if (filter.category) {
      records = records.filter(r => r.category.toLowerCase() === filter.category!.toLowerCase());
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      records = records.filter(r =>
        r.reference.toLowerCase().includes(q) ||
        r.recipientName.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q)
      );
    }

    return records;
  }

  /**
   * Approves or rejects a payment voucher.
   */
  static async updatePaymentStatus(
    id: string,
    dto: ApprovePaymentDto
  ): Promise<boolean> {
    const updated = await updateDoc('payments', id, {
      status: dto.status,
      approvedBy: dto.approvedBy || 'Agunwami CEO',
      approvedAt: new Date().toISOString(),
      notes: dto.notes || '',
    });

    return !!updated;
  }
}
