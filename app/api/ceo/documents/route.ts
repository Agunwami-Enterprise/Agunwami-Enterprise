/**
 * /api/ceo/documents
 *
 * GET: Lists executive and corporate documents.
 * POST: Registers a new corporate document.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { DocumentsService } from '@/backend/modules/documents';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const category = (searchParams.get('category') as any) || undefined;
    const search = searchParams.get('search') || undefined;

    const docs = await DocumentsService.getDocuments({ category, search });
    return NextResponse.json(docs);
  } catch (err: any) {
    console.error('[/api/ceo/documents] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const created = await DocumentsService.createDocument(body);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create document' }, { status: 400 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[/api/ceo/documents POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
