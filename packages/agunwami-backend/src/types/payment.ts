// ─── Payment Types ────────────────────────────────────────────────────────────
// Merged from:
//   aehub-onboarding/models/payment.ts     → PaymentRequest (student course payment)
//   agunwami-enterprise/modules/payments/services.ts → Payment (payroll / admin view)

export type PayType   = 'Incoming' | 'Outgoing' | 'Payroll' | 'Refund';
export type PayStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Failed';

/** Staff payroll / expense payment record (ae-ws admin view) */
export interface Payment {
  id:          string;
  amount:      number;
  type:        PayType;
  status:      PayStatus;
  description: string;
  requestedBy: string;
  approvedBy:  string;
  created:     string;
  processed:   string;
}

/** Student course payment request (aehub Paystack flow) */
export interface PaymentRequest {
  id?:                    string;
  userId:                 string;
  userEmail:              string;
  courseId:               string;
  courseName:             string;
  amount:                 number;
  method:                 'bank' | 'card';
  senderAccountNumber?:   string;
  senderBankName?:        string;
  senderBankCode?:        string;
  senderAccountName?:     string;
  cardLast4?:             string;
  cardBrand?:             string;
  transactionReference?:  string;
  status:                 'pending' | 'verified' | 'rejected';
  createdAt:              number;
}
