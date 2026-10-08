/**
 * /api/ceo/projects
 *
 * GET: Lists enterprise project records.
 * POST: Adds a new project record (name, subtitle, adminUrl, color).
 * PATCH: Updates an existing project record.
 * DELETE: Deletes a project.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { ProjectAlreadyExistsError, ProjectValidationError, ProjectsService } from '@/backend/modules/projects';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const projects = await ProjectsService.getProjectsOverview();
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/ceo/projects GET] error:', message);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.name || !body.subtitle) {
      return NextResponse.json({ error: 'Project name and category are required' }, { status: 400 });
    }
    if (!body.apiEndpoint || !String(body.apiEndpoint).trim()) {
      return NextResponse.json({ error: 'Project metrics endpoint URL is required' }, { status: 400 });
    }
    if (!body.apiToken || !String(body.apiToken).trim()) {
      return NextResponse.json({ error: 'Metrics endpoint Bearer Token is required' }, { status: 400 });
    }

    const created = await ProjectsService.createProject({
      ...body,
      name: String(body.name).trim(),
      subtitle: String(body.subtitle).trim(),
      apiEndpoint: String(body.apiEndpoint).trim(),
      apiToken: String(body.apiToken).trim(),
    });
    if (!created) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    if (err instanceof ProjectAlreadyExistsError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof ProjectValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/ceo/projects POST] error:', message);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const success = await ProjectsService.updateProject(id, updates);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    if (err instanceof ProjectValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/ceo/projects PATCH] error:', message);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    const success = await ProjectsService.deleteProject(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/ceo/projects DELETE] error:', message);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}
