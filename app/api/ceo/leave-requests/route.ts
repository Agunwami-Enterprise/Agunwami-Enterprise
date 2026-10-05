/**
 * /api/ceo/leave-requests
 *
 * GET: Lists leave requests or summary stats from AEHub Firestore.
 * PATCH: Approves or rejects a leave request.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { ProjectsService } from '@/backend/modules/projects';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { requests, projectErrors } = await ProjectsService.getProjectLeaveRequests();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'summary') {
      const today = new Date().toISOString().slice(0, 10);
      const summary = {
        totalRequests: requests.length,
        pendingApprovals: requests.filter(item => item.status === 'Pending').length,
        approved: requests.filter(item => item.status === 'Approved').length,
        rejected: requests.filter(item => item.status === 'Rejected').length,
        currentlyOnLeave: requests.filter(item =>
          item.status === 'Approved' &&
          item.startDate.slice(0, 10) <= today &&
          item.endDate.slice(0, 10) >= today,
        ).length,
      };
      return NextResponse.json(summary);
    }

    const status = searchParams.get('status');
    if (status && !['Pending', 'Approved', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid leave request status.' }, { status: 400 });
    }
    return NextResponse.json({
      requests: status ? requests.filter(item => item.status === status) : requests,
      projectErrors,
    });
  } catch (err) {
    console.error('[/api/ceo/leave-requests] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'A leave request review is required.' }, { status: 400 });
    }
    const payload = body as Record<string, unknown>;
    const projectId = typeof payload.projectId === 'string' ? payload.projectId.trim() : '';
    const requestId = typeof payload.requestId === 'string' ? payload.requestId.trim() : '';
    const status = payload.status;
    const comments = typeof payload.comments === 'string' ? payload.comments.trim() : undefined;
    if (!projectId || !requestId || (status !== 'Approved' && status !== 'Rejected')) {
      return NextResponse.json({ error: 'Project, request ID, and a valid review status are required.' }, { status: 400 });
    }

    await ProjectsService.updateProjectLeaveStatus(
      projectId,
      requestId,
      status,
      auth.session.uid,
      auth.session.email,
      comments,
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/ceo/leave-requests PATCH] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
