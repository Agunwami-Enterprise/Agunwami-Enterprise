/**
 * /api/ceo/departments
 *
 * GET: AE departments and their members. POST: create a department.
 * CEO only. See backend/modules/departments.
 */

import { NextResponse, after } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { DepartmentsService } from '@/backend/modules/departments';
import { departmentErrorResponse, readJson } from './shared';
import { autoLinkCeoOffice } from './ceo-office';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const data = await DepartmentsService.list();
    const ceoOffice = data.departments.find(department => department.builtIn);
    if (ceoOffice && Object.keys(ceoOffice.projectLinks).length === 0) after(() => autoLinkCeoOffice());
    return NextResponse.json(data);
  } catch (err) {
    return departmentErrorResponse(err, 'GET /api/ceo/departments');
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(request);
    const department = await DepartmentsService.create({
      name: String(body.name ?? ''),
      description: String(body.description ?? ''),
      pages: Array.isArray(body.pages) ? body.pages as string[] : [],
      active: body.active !== false,
      projectLinks: body.projectLinks && typeof body.projectLinks === 'object' ? body.projectLinks as Record<string, string> : {},
    }, auth.session.uid);
    return NextResponse.json({ department }, { status: 201 });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ceo/departments');
  }
}
