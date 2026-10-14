/**
 * /api/cpanel/articles/[id]/lock
 *
 * POST { action: "acquire", force? }: open the article for editing (renewed
 * every minute while the editor is open). Returns { locked, lock }: when
 * someone else is editing, locked is false and lock says who. force takes
 * over (owner and managers).
 * POST { action: "release" }: done editing (also sent when the page closes).
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { articleActor } from '@/lib/workstation/article-actor';
import { lockArticle } from '@/backend/modules/site-content';

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async session => lockArticle(id, await readJson(request), await articleActor(session)));
}
