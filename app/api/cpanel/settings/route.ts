/**
 * /api/cpanel/settings
 *
 * GET: company details and footer. PUT: replace them.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { getSettings, saveSettings } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => getSettings());
}

export async function PUT(request: Request) {
  return cpanelHandler(async () => saveSettings(await readJson(request)), { mutates: true });
}
