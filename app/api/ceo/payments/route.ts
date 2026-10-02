/**
 * /api/ceo/payments
 *
 * GET: Lists financial disbursements and stats from AEHub Firestore payments collection.
 * PATCH: Approves or rejects a payment voucher.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { PaymentsService } from '@/backend/modules/payments';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'stats') {
      const stats = await PaymentsService.getPaymentStats();
      return NextResponse.json(stats);
    }

    const status = (searchParams.get('status') as any) || undefined;
    const category = (searchParams.get('category') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const payments = await PaymentsService.getPayments({ status, category, search });
    return NextResponse.json(payments);
  } catch (err: any) {
    console.error('[/api/ceo/payments] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, status, notes } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const success = await PaymentsService.updatePaymentStatus(id, {
      status,
      approvedBy: 'Agunwami CEO',
      notes,
    });

    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('[/api/ceo/payments PATCH] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
