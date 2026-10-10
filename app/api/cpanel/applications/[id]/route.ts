/**
 * /api/cpanel/applications/[id]
 *
 * PATCH { status }: pending | reviewed | approved | declined. DELETE: remove.
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { deleteApplication, getApplication, setApplicationStatus, SiteContentNotFoundError } from '@/backend/modules/site-content';

export async function GET(_request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async () => {
    const application = await getApplication(id);
    if (!application) throw new SiteContentNotFoundError('Application');
    return application;
  });
}

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async () => setApplicationStatus(id, (await readJson(request)).status));
}

export async function DELETE(_request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(() => deleteApplication(id));
}
