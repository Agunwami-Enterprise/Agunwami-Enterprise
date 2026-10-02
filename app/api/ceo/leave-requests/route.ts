/**
 * /api/ceo/leave-requests
 *
 * GET: Lists leave requests or summary stats from AEHub Firestore.
 * PATCH: Approves or rejects a leave request.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { LeaveRequestsService } from '@/backend/modules/leave-requests';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'summary') {
      const summary = await LeaveRequestsService.getLeaveSummary();
      return NextResponse.json(summary);
    }

    const status = (searchParams.get('status') as any) || undefined;
    const items = await LeaveRequestsService.getLeaveRequests(status);
    return NextResponse.json(items);
  } catch (err: any) {
    console.error('[/api/ceo/leave-requests] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, status, comments } = body;
    if (!id || !status) {
      return NextResponse.json({ error: 'ID and status are required' }, { status: 400 });
    }

    const success = await LeaveRequestsService.updateLeaveStatus(id, {
      status,
      comments,
      reviewerName: 'Agunwami CEO',
    });

    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('[/api/ceo/leave-requests PATCH] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
