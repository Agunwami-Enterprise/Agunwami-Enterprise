import type { Payment, PayType, PayStatus } from '../types/payment';
export type { Payment, PayType, PayStatus };
/** Subscribe to all payment records ordered by date (newest first). */
export declare function subscribePayments(cb: (payments: Payment[]) => void): () => void;
/** Update payment status (e.g. approve / mark paid) */
export declare function updatePaymentStatus(id: string, status: 'paid' | 'pending' | 'failed'): Promise<void>;
