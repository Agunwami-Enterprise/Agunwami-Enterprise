/**
 * /api/ceo/departments/[id]
 *
 * PATCH: rename, describe, choose pages, activate/deactivate.
 * DELETE: delete the department (its members become unassigned). CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { DepartmentsService } from '@/backend/modules/departments';
import { departmentErrorResponse, readJson } from '../shared';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await readJson(request);
    const department = await DepartmentsService.update(id, {
      name: String(body.name ?? ''),
      description: String(body.description ?? ''),
      pages: Array.isArray(body.pages) ? body.pages as string[] : [],
      active: body.active !== false,
    }, auth.session.uid);
    invalidateAccess();
    return NextResponse.json({ department });
  } catch (err) {
    return departmentErrorResponse(err, 'PATCH /api/ceo/departments/[id]');
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    await DepartmentsService.remove(id);
    invalidateAccess();
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return departmentErrorResponse(err, 'DELETE /api/ceo/departments/[id]');
  }
}
