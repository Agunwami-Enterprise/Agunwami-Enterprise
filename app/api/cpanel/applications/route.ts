/**
 * /api/cpanel/applications
 *
 * GET: partnership applications, newest first.
 */

import { cpanelHandler } from '@/lib/workstation/cpanel-api';
import { listApplications } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listApplications());
}
