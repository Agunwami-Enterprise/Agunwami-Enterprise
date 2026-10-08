/**
 * /api/cpanel/applications/[id]
 *
 * PATCH { status }: pending | reviewed | approved | declined. DELETE: remove.
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { deleteApplication, setApplicationStatus } from '@/backend/modules/site-content';

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async () => setApplicationStatus(id, (await readJson(request)).status));
}

export async function DELETE(_request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(() => deleteApplication(id));
}
