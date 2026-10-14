/**
 * /api/cpanel/articles/[id]
 *
 * PATCH: save changes (edit access; publishing needs manage access).
 * DELETE: remove (the owner, or the CEO).
 */

import { cpanelHandler, readJson, type IdParams } from '@/lib/workstation/cpanel-api';
import { articleActor } from '@/lib/workstation/article-actor';
import { saveArticle, deleteArticle } from '@/backend/modules/site-content';

export async function PATCH(request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async session => saveArticle(await readJson(request), await articleActor(session), id), { mutates: true });
}

export async function DELETE(_request: Request, { params }: IdParams) {
  const { id } = await params;
  return cpanelHandler(async session => deleteArticle(id, await articleActor(session)), { mutates: true });
}
