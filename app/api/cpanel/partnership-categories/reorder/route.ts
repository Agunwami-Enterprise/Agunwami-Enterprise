/**
 * /api/cpanel/partnership-categories/reorder
 *
 * POST { ids }: saves the order (first to last) and renumbers the categories.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { reorderPartnershipCategories } from '@/backend/modules/site-content';

export async function POST(request: Request) {
  return cpanelHandler(async () => reorderPartnershipCategories((await readJson(request)).ids), { mutates: true });
}
