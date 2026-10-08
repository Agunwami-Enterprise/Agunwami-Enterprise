/**
 * /api/cpanel/team/[id]
 *
 * PATCH: save changes. DELETE: remove.
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { saveTeamMember, deleteTeamMember } from '@/backend/modules/site-content';

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async () => saveTeamMember(await readJson(request), id), { mutates: true });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(() => deleteTeamMember(id), { mutates: true });
}
