/**
 * GET /api/ceo/approvals
 *
 * Real pending approval items for the CEO dashboard.
 * Powered by backend/services/approvals.service.ts.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getPendingApprovals } from '@/backend/services/approvals.service';

export async function GET(req: NextRequest) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50);

  try {
    const approvals = await getPendingApprovals(limit);
    return NextResponse.json({ approvals });
  } catch (err: any) {
    console.error('[/api/ceo/approvals] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
export async function POST(req: NextRequest) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const { id, sourceCollection, notes } = body;
    if (!id || !sourceCollection) {
      return NextResponse.json({ error: 'id and sourceCollection are required' }, { status: 400 });
    }

    const { updateDoc, getDoc, createDoc } = await import('@/backend/core/firestore');
    const approverName = auth.session?.email || 'Agunwami CEO';
    const nowIso = new Date().toISOString();

    if (sourceCollection === 'salary_disbursements') {
      const existing = await getDoc('salary_disbursements', id);
      await updateDoc('salary_disbursements', id, {
        status: 'Completed',
        approvedAt: nowIso,
        approvedBy: approverName,
      });

      // Now that the payment is actually approved/completed, record completed payment in payments collection
      if (existing) {
        await createDoc('payments', {
          amount: Number(existing.amount) || 0,
          currency: existing.currency || 'NGN',
          type: 'salary_disbursement',
          status: 'COMPLETED',
          description: existing.notes || existing.description || `Salary disbursement to ${existing.staffName || 'Staff Member'}`,
          staffId: existing.staffId || null,
          staffName: existing.staffName || 'Staff Member',
          department: existing.department || 'Staff',
          month: existing.month || 'Current Period',
          reference: existing.reference || id,
          approvedByName: approverName,
          processedAt: nowIso,
          createdAt: nowIso,
        }, id);
      }
    } else if (sourceCollection === 'leaveRequests') {
      await updateDoc('leaveRequests', id, {
        status: 'approved',
        approvedAt: nowIso,
        approvedBy: approverName,
      });
    } else if (sourceCollection === 'staffRequests') {
      await updateDoc('staffRequests', id, {
        status: 'approved',
        approvedAt: nowIso,
        approvedBy: approverName,
      });
    } else if (sourceCollection === 'payments') {
      await updateDoc('payments', id, {
        status: 'COMPLETED',
        approvedAt: nowIso,
        approvedBy: approverName,
      });
    }

    return NextResponse.json({ success: true, id, status: 'approved' });
  } catch (err: any) {
    console.error('[/api/ceo/approvals POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
