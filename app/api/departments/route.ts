/**
 * GET /api/departments
 *
 * The AE departments (id and name), for anyone signed in to the workstation:
 * used to choose which departments a document is shared with.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { DepartmentsService } from '@/backend/modules/departments';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const { departments } = await DepartmentsService.list();
    return NextResponse.json({ departments: departments.map(d => ({ id: d.id, name: d.name })) });
  } catch (err) {
    console.error('[GET /api/departments]', err);
    return NextResponse.json({ error: 'Departments could not be loaded.' }, { status: 500 });
  }
}
