/**
 * /api/ceo/projects
 *
 * GET: Lists all user-configured projects with live metrics from their API endpoints.
 * POST: Adds a new project (name, subtitle, adminUrl, apiEndpoint, color).
 * PATCH: Updates an existing project's configuration or endpoints.
 * DELETE: Deletes a project.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { ProjectsService } from '@/backend/modules/projects';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const projects = await ProjectsService.getProjectsOverview();
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error('[/api/ceo/projects GET] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    if (!body.name || !body.subtitle) {
      return NextResponse.json({ error: 'Project name and subtitle are required' }, { status: 400 });
    }

    const created = await ProjectsService.createProject(body);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[/api/ceo/projects POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
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
  } catch (err: any) {
    console.error('[/api/ceo/projects PATCH] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
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
  } catch (err: any) {
    console.error('[/api/ceo/projects DELETE] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
