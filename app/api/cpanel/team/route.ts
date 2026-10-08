/**
 * /api/cpanel/team
 * Team members on the About page.
 *
 * GET: list. POST: create.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { listTeam, saveTeamMember } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listTeam());
}

export async function POST(request: Request) {
  return cpanelHandler(async () => saveTeamMember(await readJson(request)), { mutates: true, status: 201 });
}
