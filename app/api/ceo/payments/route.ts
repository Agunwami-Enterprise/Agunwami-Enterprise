/**
 * /api/ceo/payments
 *
 * GET: The Payments page list: the enterprise's payments plus each project's
 *      reported payments, labelled by source. `?mode=stats` returns stats.
 * POST: Records a payment in the enterprise's books.
 * PATCH: Approves or rejects one of the enterprise's pending payments, or
 *        marks an approved one as paid (status COMPLETED).
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { PaymentsService } from '@/backend/modules/payments';
import { PAYMENT_CURRENCIES, PAYMENT_TYPES, type NewPaymentDto, type PaymentType } from '@/backend/modules/payments/payments.types';
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

const field = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const type = PAYMENT_TYPES.includes(body.type as PaymentType) ? body.type as PaymentType : null;
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
    const currency = field(body.currency, 3).toUpperCase();
    const description = field(body.description, 300);
    const party = field(body.party, 120);
    const category = field(body.category, 60);
    const date = field(body.date, 10);

    if (!type) return NextResponse.json({ error: 'Choose whether the payment is incoming, outgoing, payroll or a refund.' }, { status: 400 });
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e12) return NextResponse.json({ error: 'Enter an amount greater than zero.' }, { status: 400 });
    if (!(PAYMENT_CURRENCIES as readonly string[]).includes(currency)) return NextResponse.json({ error: 'Choose a currency.' }, { status: 400 });
    if (!description) return NextResponse.json({ error: 'Add a description.' }, { status: 400 });
    if (!party) return NextResponse.json({ error: type === 'incoming' ? 'Say who the payment is from.' : 'Say who the payment is to.' }, { status: 400 });
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))) return NextResponse.json({ error: 'Enter a valid date.' }, { status: 400 });

    const dto: NewPaymentDto = {
      type,
      amount: Math.round(amount * 100) / 100,
      currency,
      category: category || { incoming: 'Revenue', outgoing: 'Operations', payroll: 'Payroll', refund: 'Refund' }[type],
      description,
      party,
      status: body.status === 'PENDING' ? 'PENDING' : 'COMPLETED',
      ...(date ? { date } : {}),
    };
    const id = await PaymentsService.createPayment(dto, 'Agunwami CEO');
    if (!id) return NextResponse.json({ error: 'The payment could not be saved. Please try again.' }, { status: 502 });
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error('[/api/ceo/payments POST] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json().catch(() => ({})) as { id?: unknown; status?: unknown; notes?: unknown };
    const id = typeof body.id === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(body.id) ? body.id : '';
    const status = body.status === 'APPROVED' || body.status === 'REJECTED' || body.status === 'COMPLETED' ? body.status : null;
    if (!id || !status) {
      return NextResponse.json({ error: 'A payment ID and a status of APPROVED, REJECTED or COMPLETED are required.' }, { status: 400 });
    }

    const result = await PaymentsService.updatePaymentStatus(id, {
      status,
      approvedBy: 'Agunwami CEO',
      notes: typeof body.notes === 'string' ? body.notes.slice(0, 500) : undefined,
    });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/ceo/payments PATCH] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
