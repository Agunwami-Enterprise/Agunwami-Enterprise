/**
 * /api/ceo/departments/members/[uid]
 *
 * PATCH: change a member's position (department admin or staff), shift, page access,
 * suspend or reactivate them, or transfer them to another department.
 * `syncProjects` (project ids) limits which linked projects a transfer is
 * applied in; left out, it's applied in all of them.
 * DELETE: remove them from their AE department.
 * Changes are also applied in linked project departments (department-sync). CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { DepartmentsService, type UpdateMemberDto } from '@/backend/modules/departments';
import { reportedEmail, syncRemoved, syncUpdated } from '@/lib/workstation/department-sync';
import { departmentErrorResponse, readJson } from '../../shared';

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { uid } = await params;
    const body = await readJson(request);
    const dto: UpdateMemberDto = {};
    if (typeof body.shiftStart === 'string') dto.shiftStart = body.shiftStart;
    if (typeof body.shiftEnd === 'string') dto.shiftEnd = body.shiftEnd;
    if (Array.isArray(body.pages)) dto.pages = body.pages as string[];
    if (typeof body.isDepartmentAdmin === 'boolean') dto.isDepartmentAdmin = body.isDepartmentAdmin;
    if (body.status === 'active' || body.status === 'suspended') dto.status = body.status;
    if (typeof body.suspendedReason === 'string') dto.suspendedReason = body.suspendedReason;
    if (typeof body.departmentId === 'string') dto.departmentId = body.departmentId;
    const before = await DepartmentsService.getMember(uid);
    const member = await DepartmentsService.updateMember(uid, dto, auth.session.uid);
    invalidateAccess(uid);
    const syncProjects = Array.isArray(body.syncProjects) ? body.syncProjects.filter((id): id is string => typeof id === 'string') : undefined;
    const sync = before ? await syncUpdated(before, member, await DepartmentsService.get(member.departmentId), syncProjects) : [];
    const email = reportedEmail(member, sync);
    if (email) await DepartmentsService.updateMemberEmail(uid, email).catch(() => undefined);
    return NextResponse.json({ member: email ? { ...member, email } : member, sync });
  } catch (err) {
    return departmentErrorResponse(err, 'PATCH /api/ceo/departments/members/[uid]');
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { uid } = await params;
    const before = await DepartmentsService.getMember(uid);
    await DepartmentsService.unassign(uid);
    invalidateAccess(uid);
    const sync = before ? await syncRemoved(before, await DepartmentsService.get(before.departmentId)) : [];
    return NextResponse.json({ removed: true, sync });
  } catch (err) {
    return departmentErrorResponse(err, 'DELETE /api/ceo/departments/members/[uid]');
  }
}
