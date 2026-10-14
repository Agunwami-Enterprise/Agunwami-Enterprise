/**
 * /api/cpanel/articles/[id]/access
 *
 * PUT { collaborators: [{ uid, name, email, role }] }: who else may view,
 * edit or manage the article (owner and managers).
 * POST { action: "transfer", owner: { uid, name, email } }: hand the article
 * to someone else (owner only).
 * POST { action: "claim" }: become the owner of an article from before sharing.
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { articleActor } from '@/lib/workstation/article-actor';
import { claimArticle, setArticleCollaborators, transferArticleOwnership } from '@/backend/modules/site-content';

export async function PUT(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async session => setArticleCollaborators(id, await readJson(request), await articleActor(session)));
}

export async function POST(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async session => {
    const input = await readJson(request);
    const actor = await articleActor(session);
    return input.action === 'claim' ? claimArticle(id, actor) : transferArticleOwnership(id, input, actor);
  });
}
