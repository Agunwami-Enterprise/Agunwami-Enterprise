import type { Payment, PayType, PayStatus } from '../types/payment';
export type { Payment, PayType, PayStatus };
/** Subscribe to all payment records ordered by date (newest first). */
export declare function subscribePayments(cb: (payments: Payment[]) => void): () => void;
