/**
 * PATCH /api/ws/leave-requests { requestId, status: Approved | Rejected, comments? }
 *
 * A department admin approves or rejects a leave request from someone in
 * their AE department (never their own). It goes through the project's leave
 * endpoint, like the CEO's leave page, so AE Hub puts tasks on hold and
 * notifies people.
 */

import { NextResponse } from 'next/server';
import { requireWorkstationPage } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { DepartmentsService } from '@/backend/modules/departments';
import { ProjectsService } from '@/backend/modules/projects';
import { readJson } from '@/app/api/ceo/departments/shared';

export async function PATCH(request: Request) {
  const auth = await requireWorkstationPage('leave-requests');
  if (auth.error) return auth.error;
  try {
    const access = await getWorkstationAccess(auth.session);
    if (access.kind !== 'ceo' && !access.isDepartmentAdmin) {
      return NextResponse.json({ error: 'Only the department admin can review leave requests.' }, { status: 403 });
    }
    const body = await readJson(request);
    const requestId = typeof body.requestId === 'string' ? body.requestId.trim() : '';
    const status = body.status === 'Approved' || body.status === 'Rejected' ? body.status : null;
    const comments = typeof body.comments === 'string' ? body.comments.trim().slice(0, 500) : undefined;
    if (!requestId || !status) return NextResponse.json({ error: 'A request and Approved or Rejected are required.' }, { status: 400 });

    // Find the request in the projects' leave lists (refreshing once for a new one).
    let leave = (await ProjectsService.getProjectLeaveRequests()).requests.find(r => r.id === requestId);
    if (!leave) {
      leave = (await ProjectsService.getProjectsOverview(true)).flatMap(p => p.leaveRequests ?? []).find(r => r.id === requestId);
    }
    if (!leave) return NextResponse.json({ error: 'That leave request could not be found in any project.' }, { status: 404 });
    if (leave.userId === auth.session.uid) return NextResponse.json({ error: 'You can’t review your own leave request.' }, { status: 403 });

    const { members } = await DepartmentsService.list();
    const inDepartment = members.some(m => m.uid === leave.userId && (access.kind === 'ceo' || m.departmentId === access.departmentId));
    if (!inDepartment) return NextResponse.json({ error: 'That person isn’t in your department.' }, { status: 403 });

    const me = members.find(m => m.uid === auth.session.uid);
    await ProjectsService.updateProjectLeaveStatus(leave.projectId, leave.id, status, auth.session.uid, me?.name || auth.session.email, comments);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[/api/ws/leave-requests] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'The leave request could not be updated.' }, { status: 500 });
  }
}
