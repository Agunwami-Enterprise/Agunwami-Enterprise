/**
 * /api/cpanel/projects
 * Client projects on /projects.
 *
 * GET: list. POST: create.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { listProjects, saveProject } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listProjects());
}

export async function POST(request: Request) {
  return cpanelHandler(async () => saveProject(await readJson(request)), { mutates: true, status: 201 });
}
