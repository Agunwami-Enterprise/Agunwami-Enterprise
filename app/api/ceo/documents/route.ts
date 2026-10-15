/**
 * /api/ceo/documents
 *
 * GET: The Documents page list: the enterprise's documents plus each project's
 *      reported documents, labelled by source.
 * POST: Registers a new corporate document.
 * DELETE ?id=: Removes one of the enterprise's documents (e.g. sample entries with no file).
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { DocumentsService } from '@/backend/modules/documents';
import { getDocumentsFeed } from '@/backend/modules/documents/documents.feed';

const errorMessage = (err: unknown) => (err instanceof Error && err.message) || 'Internal error';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    return NextResponse.json(await getDocumentsFeed());
  } catch (err) {
    console.error('[/api/ceo/documents] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const created = await DocumentsService.createDocument(body, auth.session);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create document' }, { status: 400 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('[/api/ceo/documents POST] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[\w-]{1,128}$/.test(id)) return NextResponse.json({ error: 'Which document?' }, { status: 400 });
  try {
    if (!(await DocumentsService.deleteDocument(id))) return NextResponse.json({ error: 'The document could not be deleted.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[/api/ceo/documents DELETE] error:', err);
    return NextResponse.json({ error: errorMessage(err) }, { status: 500 });
  }
}
