/**
 * /api/cpanel/team/reorder
 *
 * POST { ids }: saves the team order (first to last), used on the website.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { reorderTeam } from '@/backend/modules/site-content';

export async function POST(request: Request) {
  return cpanelHandler(async () => reorderTeam((await readJson(request)).ids), { mutates: true });
}
