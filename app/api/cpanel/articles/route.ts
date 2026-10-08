/**
 * /api/cpanel/articles
 * Expert Insights articles (drafts included).
 *
 * GET: list. POST: create.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import { listArticles, saveArticle } from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listArticles());
}

export async function POST(request: Request) {
  return cpanelHandler(async () => saveArticle(await readJson(request)), { mutates: true, status: 201 });
}
