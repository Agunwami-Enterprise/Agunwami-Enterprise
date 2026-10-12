/**
 * /api/ceo/departments/[id]/members
 *
 * POST: add a person to the department (moving them out of any other). CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { DepartmentsService } from '@/backend/modules/departments';
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
      title: String(body.title ?? ''),
    }, auth.session.uid);
    invalidateAccess(member.uid);
    return NextResponse.json({ member }, { status: 201 });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ceo/departments/[id]/members');
  }
}
