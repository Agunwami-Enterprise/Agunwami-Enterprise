/**
 * /api/cpanel/article-categories
 * Article categories (kept in the site settings), each with its article count.
 *
 * GET: list. POST { name }: add. PATCH { from, to }: rename (its articles move
 * with it). DELETE ?name=: remove an empty category.
 */

import { cpanelHandler, readJson } from '@/lib/workstation/cpanel-api';
import {
  addArticleCategory,
  listArticleCategories,
  removeArticleCategory,
  renameArticleCategory,
} from '@/backend/modules/site-content';

export async function GET() {
  return cpanelHandler(() => listArticleCategories());
}

export async function POST(request: Request) {
  return cpanelHandler(async () => addArticleCategory(await readJson(request)), { mutates: true, status: 201 });
}

export async function PATCH(request: Request) {
  return cpanelHandler(async () => renameArticleCategory(await readJson(request)), { mutates: true });
}

export async function DELETE(request: Request) {
  const name = new URL(request.url).searchParams.get('name') ?? '';
  return cpanelHandler(() => removeArticleCategory(name), { mutates: true });
}
