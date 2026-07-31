export type PaymentStatus = 'pending' | 'processed' | 'failed';

export interface Payment {
  id: string;
  recipientUid: string;
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  processedAt: string | null;
  reference: string;
}
