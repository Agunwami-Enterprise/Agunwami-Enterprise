/**
 * /api/documents/templates
 *
 * Templates people added for new documents and spreadsheets (company-wide,
 * next to the built-in ones), kept in the enterprise database.
 * GET: the list (without contents), with whether the caller may delete each.
 * GET ?id=: one template with its contents.
 * POST { label, description, category, kind: "doc" | "sheet", content | sheets }: add one.
 * DELETE ?id=: remove one (whoever added it, or the CEO).
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { createDoc, deleteDoc, getDoc, listDocs } from '@/backend/core/firestore';

const COLLECTION = 'documentTemplates';
const MAX_BYTES = 900 * 1024;
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function summary(raw: Record<string, unknown>, uid: string, isCeo: boolean) {
  return {
    id: String(raw._id),
    label: str(raw.label) || 'Template',
    description: str(raw.description, 300),
    category: str(raw.category) || 'Templates',
    kind: raw.kind === 'sheet' ? 'sheet' : 'doc',
    createdBy: str(raw.createdBy),
    createdAt: str(raw.createdAt),
    canDelete: isCeo || raw.createdByUid === uid,
  };
}

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const isCeo = (await getWorkstationAccess(auth.session)).kind === 'ceo';
  const id = new URL(request.url).searchParams.get('id');
  try {
    if (id) {
      const raw = await getDoc(COLLECTION, id) as Record<string, unknown> | null;
      if (!raw) return NextResponse.json({ error: 'That template was deleted.' }, { status: 404 });
      return NextResponse.json({ template: { ...summary(raw, auth.session.uid, isCeo), content: str(raw.content, MAX_BYTES), sheets: str(raw.sheets, MAX_BYTES) } });
    }
    const all = await listDocs(COLLECTION, 300) as Record<string, unknown>[];
    const templates = all.map(raw => summary(raw, auth.session.uid, isCeo)).sort((a, b) => a.label.localeCompare(b.label));
    return NextResponse.json({ templates });
  } catch (err) {
    console.error('[GET /api/documents/templates]', err);
    return NextResponse.json({ error: 'Templates could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const kind = body.kind === 'sheet' ? 'sheet' : 'doc';
  const content = kind === 'doc' && typeof body.content === 'string' ? body.content : '';
  const sheets = kind === 'sheet' && typeof body.sheets === 'string' ? body.sheets : '';
  const label = str(body.label, 80);
  if (!label) return NextResponse.json({ error: 'Give the template a name.' }, { status: 400 });
  if (!(content || sheets)) return NextResponse.json({ error: 'The template is empty.' }, { status: 400 });
  if (Buffer.byteLength(content || sheets) > MAX_BYTES) return NextResponse.json({ error: 'This template is too large. Use a shorter file.' }, { status: 413 });
  try {
    const created = await createDoc(COLLECTION, {
      label, description: str(body.description, 300), category: str(body.category) || 'Templates', kind, content, sheets,
      createdBy: str(body.createdBy) || auth.session.email, createdByUid: auth.session.uid, createdAt: new Date().toISOString(),
    });
    if (!created) return NextResponse.json({ error: 'The template could not be saved.' }, { status: 502 });
    return NextResponse.json({ id: created._id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/documents/templates]', err);
    return NextResponse.json({ error: 'The template could not be saved.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const id = new URL(request.url).searchParams.get('id') ?? '';
  try {
    const raw = await getDoc(COLLECTION, id) as Record<string, unknown> | null;
    if (!raw) return NextResponse.json({ ok: true });
    const isCeo = (await getWorkstationAccess(auth.session)).kind === 'ceo';
    if (!isCeo && raw.createdByUid !== auth.session.uid) {
      return NextResponse.json({ error: 'Only the person who added this template, or the CEO, can delete it.' }, { status: 403 });
    }
    if (!(await deleteDoc(COLLECTION, id))) return NextResponse.json({ error: 'The template could not be deleted.' }, { status: 502 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE /api/documents/templates]', err);
    return NextResponse.json({ error: 'The template could not be deleted.' }, { status: 500 });
  }
}
