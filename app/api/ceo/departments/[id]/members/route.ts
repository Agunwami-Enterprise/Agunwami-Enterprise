/**
 * /api/ceo/departments/[id]/members
 *
 * POST: add a person to the department (moving them out of any other), and
 * apply it in the project departments this department is linked to. CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { DepartmentsService } from '@/backend/modules/departments';
import { reportedEmail, syncAdded } from '@/lib/workstation/department-sync';
import { departmentErrorResponse, readJson } from '../../shared';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await readJson(request);
    const member = await DepartmentsService.assign(id, {
      uid: String(body.uid ?? ''),
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
    }, auth.session.uid);
    invalidateAccess(member.uid);
    const syncProjects = Array.isArray(body.syncProjects) ? body.syncProjects.filter((p): p is string => typeof p === 'string') : undefined;
    const sync = await syncAdded(member, await DepartmentsService.get(id), syncProjects);
    const email = reportedEmail(member, sync);
    if (email) await DepartmentsService.updateMemberEmail(member.uid, email).catch(() => undefined);
    return NextResponse.json({ member: email ? { ...member, email } : member, sync }, { status: 201 });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ceo/departments/[id]/members');
  }
}
