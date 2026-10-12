/**
 * /api/ceo/departments/members/[uid]
 *
 * PATCH: change a member's position, shift, page access or admin rights,
 * suspend or reactivate them, or transfer them to another department.
 * DELETE: remove them from their AE department. CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { DepartmentsService, type UpdateMemberDto } from '@/backend/modules/departments';
import { departmentErrorResponse, readJson } from '../../shared';

export async function PATCH(request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { uid } = await params;
    const body = await readJson(request);
    const dto: UpdateMemberDto = {};
    if (typeof body.title === 'string') dto.title = body.title;
    if (typeof body.shiftStart === 'string') dto.shiftStart = body.shiftStart;
    if (typeof body.shiftEnd === 'string') dto.shiftEnd = body.shiftEnd;
    if (Array.isArray(body.pages)) dto.pages = body.pages as string[];
    if (typeof body.isDepartmentAdmin === 'boolean') dto.isDepartmentAdmin = body.isDepartmentAdmin;
    if (body.status === 'active' || body.status === 'suspended') dto.status = body.status;
    if (typeof body.suspendedReason === 'string') dto.suspendedReason = body.suspendedReason;
    if (typeof body.departmentId === 'string') dto.departmentId = body.departmentId;
    const member = await DepartmentsService.updateMember(uid, dto, auth.session.uid);
    invalidateAccess(uid);
    return NextResponse.json({ member });
  } catch (err) {
    return departmentErrorResponse(err, 'PATCH /api/ceo/departments/members/[uid]');
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ uid: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { uid } = await params;
    await DepartmentsService.unassign(uid);
    invalidateAccess(uid);
    return NextResponse.json({ removed: true });
  } catch (err) {
    return departmentErrorResponse(err, 'DELETE /api/ceo/departments/members/[uid]');
  }
}
