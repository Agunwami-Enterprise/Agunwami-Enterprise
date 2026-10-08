/**
 * /api/ceo/projects
 *
 * The AE workstation's projects. The website C-panel edits the same records.
 *
 * GET: Lists enterprise project records (CEO).
 * POST: Adds a project. With { website } it comes from the C-panel (CEO or
 *   content team) and needs no metrics endpoint; otherwise it is the CEO
 *   dashboard form (name, subtitle, endpoint, token, ...).
 * PATCH: Updates a project. { id, website } or { id, websitePublished } come
 *   from the C-panel; any other change is CEO-only.
 * DELETE: Deletes a project (CEO).
 */

import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireCeoSession, requireContentSession } from '@/lib/workstation/api-auth';
import { runContentAction } from '@/lib/workstation/cpanel-api';
import { clearPublicContentCache } from '@/lib/site/content-cache';
import { ProjectAlreadyExistsError, ProjectValidationError, ProjectsService } from '@/backend/modules/projects';
import { saveProject, setProjectPublished } from '@/backend/modules/site-content';

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

// Project names, links and visibility show on the public website.
const refreshWebsite = () => {
  clearPublicContentCache();
  revalidatePath('/', 'layout');
};

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
  const body = await request.json().catch(() => null);
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Send the project as a JSON object.' }, { status: 400 });
  }

  if (isObject(body.website)) {
    const auth = await requireContentSession();
    if (auth.error) return auth.error;
    const website = body.website;
    return runContentAction(() => saveProject(website), { mutates: true, status: 201, logLabel: 'ceo/projects POST' });
  }

  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
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
      name: String(body.name).trim(),
      subtitle: String(body.subtitle).trim(),
      description: typeof body.description === 'string' ? body.description : undefined,
      lead: typeof body.lead === 'string' ? body.lead : undefined,
      adminUrl: typeof body.adminUrl === 'string' ? body.adminUrl : undefined,
      color: typeof body.color === 'string' ? body.color : undefined,
      apiEndpoint: String(body.apiEndpoint).trim(),
      apiToken: String(body.apiToken).trim(),
    });
    if (!created) {
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    refreshWebsite();
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
  const body = await request.json().catch(() => null);
  if (!isObject(body)) {
    return NextResponse.json({ error: 'Send the changes as a JSON object.' }, { status: 400 });
  }
  const { id, website, websitePublished, ...updates } = body;
  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
  }

  if (isObject(website) || typeof websitePublished === 'boolean') {
    const auth = await requireContentSession();
    if (auth.error) return auth.error;
    return runContentAction(
      async (): Promise<unknown> => (isObject(website)
        ? saveProject(website, id)
        : setProjectPublished(id, websitePublished as boolean)),
      { mutates: true, logLabel: 'ceo/projects PATCH' },
    );
  }

  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const success = await ProjectsService.updateProject(id, updates);
    refreshWebsite();
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
    refreshWebsite();
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/ceo/projects DELETE] error:', message);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}
