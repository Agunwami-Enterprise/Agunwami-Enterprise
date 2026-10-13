/**
 * /api/ceo/departments/project-departments
 *
 * GET: each project's departments (from its metrics), for linking AE
 * departments to project departments. CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { ProjectsService } from '@/backend/modules/projects';
import { departmentErrorResponse } from '../shared';
import { autoLinkCeoOffice } from '../ceo-office';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const projects = await ProjectsService.getProjectDepartmentOptions();
    await autoLinkCeoOffice(projects);
    return NextResponse.json({ projects });
  } catch (err) {
    return departmentErrorResponse(err, 'GET /api/ceo/departments/project-departments');
  }
}
