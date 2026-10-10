/**
 * /api/ceo/payments
 *
 * GET: The Payments page list: the enterprise's payments plus each project's
 *      reported payments, labelled by source. `?mode=stats` returns stats.
 * PATCH: Approves or rejects one of the enterprise's own payment vouchers.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { PaymentsService } from '@/backend/modules/payments';
import { getPaymentsFeed } from '@/backend/modules/payments/payments.feed';

const errorMessage = (err: unknown) => (err instanceof Error && err.message) || 'Internal error';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    if (new URL(request.url).searchParams.get('mode') === 'stats') {
      return NextResponse.json(await PaymentsService.getPaymentStats());
    }
    return NextResponse.json(await getPaymentsFeed());
  } catch (err) {
    console.error('[/api/ceo/payments] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown; notes?: unknown };
    const id = typeof body.id === 'string' ? body.id : '';
    const status = body.status === 'APPROVED' || body.status === 'REJECTED' ? body.status : null;
    if (!id || !status) {
      return NextResponse.json({ error: 'A payment ID and a status of APPROVED or REJECTED are required.' }, { status: 400 });
    }

    const success = await PaymentsService.updatePaymentStatus(id, {
      status,
      approvedBy: 'Agunwami CEO',
      notes: typeof body.notes === 'string' ? body.notes : undefined,
    });
    if (!success) {
      return NextResponse.json({ error: 'The payment could not be updated. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ success });
  } catch (err) {
    console.error('[/api/ceo/payments PATCH] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
