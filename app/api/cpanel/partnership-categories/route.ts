/**
 * /api/cpanel/partnership-categories
 * Partnership categories on /partnerships.
 *
 * GET: list. POST: create.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { listPartnershipCategories, savePartnershipCategory } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listPartnershipCategories());
}

export async function POST(request: Request) {
  return cpanelHandler(async () => savePartnershipCategory(await readJson(request)), { mutates: true, status: 201 });
}
