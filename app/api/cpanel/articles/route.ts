/**
 * /api/cpanel/articles
 * Expert Insights articles (drafts included), each with what the signed-in
 * person may do with it.
 *
 * GET: list. POST: create (the creator owns it).
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { articleActor } from '@/lib/workstation/article-actor';
import { listArticlesFor, saveArticle } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(async session => listArticlesFor(await articleActor(session)));
}

export async function POST(request: Request) {
  return cpanelHandler(async session => saveArticle(await readJson(request), await articleActor(session)), { mutates: true, status: 201 });
}
