/**
 * /api/departments/[id]/resources
 *
 * A department's guides, handbooks, manuals and links.
 * GET: for its members and the CEO, with whether the caller can manage them.
 * POST { kind, title, type: "link" | "document", url?, documentId?, documentFormat? }: add one.
 * DELETE ?resourceId=: remove one (a document stays in Documents).
 * Adding and removing are for the department's admin and the CEO.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { DepartmentError, DepartmentsService } from '@/backend/modules/departments';

type Params = { params: Promise<{ id: string }> };

async function authorize(id: string) {
  const auth = await requireSession();
  if (auth.error) return { error: auth.error };
  const access = await getWorkstationAccess(auth.session);
  const member = access.kind === 'department' && access.departmentId === id;
  if (access.kind !== 'ceo' && !member) {
    return { error: NextResponse.json({ error: 'This is for the department’s own people.' }, { status: 403 }) };
  }
  return { session: auth.session, canManage: access.kind === 'ceo' || (member && access.isDepartmentAdmin) };
}

function failure(err: unknown, where: string) {
  if (err instanceof DepartmentError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`[${where}]`, err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  try {
    const department = await DepartmentsService.get(id);
    if (!department) return NextResponse.json({ error: 'That department no longer exists.' }, { status: 404 });
    return NextResponse.json({ departmentName: department.name, resources: department.resources, canManage: auth.canManage });
  } catch (err) {
    return failure(err, 'GET /api/departments/[id]/resources');
  }
}

export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  if (!auth.canManage) return NextResponse.json({ error: 'Only the department admin and the CEO can add guides.' }, { status: 403 });
  try {
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const resources = await DepartmentsService.addResource(id, {
      kind: String(body.kind ?? ''), title: String(body.title ?? ''), type: String(body.type ?? ''),
      url: String(body.url ?? ''), documentId: String(body.documentId ?? ''), documentFormat: String(body.documentFormat ?? ''),
    }, auth.session.uid);
    return NextResponse.json({ resources }, { status: 201 });
  } catch (err) {
    return failure(err, 'POST /api/departments/[id]/resources');
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const { id } = await params;
  const auth = await authorize(id);
  if (auth.error) return auth.error;
  if (!auth.canManage) return NextResponse.json({ error: 'Only the department admin and the CEO can remove guides.' }, { status: 403 });
  try {
    const resourceId = new URL(request.url).searchParams.get('resourceId') ?? '';
    return NextResponse.json({ resources: await DepartmentsService.removeResource(id, resourceId) });
  } catch (err) {
    return failure(err, 'DELETE /api/departments/[id]/resources');
  }
}
