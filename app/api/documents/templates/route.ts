/**
 * /api/documents/templates
 *
 * Templates people added for new documents and spreadsheets (company-wide,
 * next to the built-in ones), kept in the enterprise database.
 * GET: the list (without contents), with whether the caller may delete each,
 *   and the built-in templates the CEO removed (`hidden`).
 * GET ?id=: one template with its contents.
 * POST { label, description, category, kind: "doc" | "sheet", content | sheets, letterhead?, orientation? }: add one
 *   (a letterhead: a page design in AE Hub's storage shown behind every page, from a PDF).
 * POST { restoreBuiltIns: true }: bring back the built-in templates the CEO removed (CEO only).
 * DELETE ?id=: remove one (whoever added it, or the CEO).
 * DELETE ?builtin=: remove a built-in template for everyone (CEO only; blank ones stay).
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { createDoc, deleteDoc, getDoc, listDocs, updateDoc } from '@/backend/core/firestore';
import { hubFileUrl } from '@/lib/documents/hub-storage';

const COLLECTION = 'documentTemplates';
/** Which built-in templates the CEO removed: documentTemplateSettings/builtIns { hidden: string[] }. */
const SETTINGS = 'documentTemplateSettings';
const BUILT_INS = 'builtIns';
const KEEP = new Set(['blank', 'blank-sheet']);

async function hiddenBuiltIns(): Promise<string[]> {
  const raw = await getDoc(SETTINGS, BUILT_INS).catch(() => null) as { hidden?: unknown } | null;
  return Array.isArray(raw?.hidden) ? raw.hidden.filter((x): x is string => typeof x === 'string') : [];
}

async function saveHidden(hidden: string[]): Promise<boolean> {
  const updated = await updateDoc(SETTINGS, BUILT_INS, { hidden }).catch(() => null);
  return !!updated || !!(await createDoc(SETTINGS, { hidden }, BUILT_INS).catch(() => null));
}
const MAX_BYTES = 900 * 1024;
const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** A letterhead whose picture is in AE Hub's storage, or null. */
function letterheadOf(value: unknown): { src: string; top: number; bottom: number } | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  const share = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(0.45, Math.max(0, n)) : null);
  const top = share(v.top);
  const bottom = share(v.bottom);
  if (typeof v.src !== 'string' || !hubFileUrl(v.src) || top === null || bottom === null) return null;
  return { src: v.src, top, bottom };
}

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
      return NextResponse.json({ template: {
        ...summary(raw, auth.session.uid, isCeo), content: str(raw.content, MAX_BYTES), sheets: str(raw.sheets, MAX_BYTES),
        letterhead: letterheadOf(raw.letterhead), orientation: raw.orientation === 'landscape' ? 'landscape' : 'portrait',
      } });
    }
    const [all, hidden] = await Promise.all([listDocs(COLLECTION, 300) as Promise<Record<string, unknown>[]>, hiddenBuiltIns()]);
    const templates = all.map(raw => summary(raw, auth.session.uid, isCeo)).sort((a, b) => a.label.localeCompare(b.label));
    return NextResponse.json({ templates, hidden, canManageBuiltIns: isCeo });
  } catch (err) {
    console.error('[GET /api/documents/templates]', err);
    return NextResponse.json({ error: 'Templates could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  if (body.restoreBuiltIns === true) {
    if ((await getWorkstationAccess(auth.session)).kind !== 'ceo') return NextResponse.json({ error: 'Only the CEO can bring back built-in templates.' }, { status: 403 });
    return (await saveHidden([])) ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'The templates could not be restored.' }, { status: 502 });
  }
  const kind = body.kind === 'sheet' ? 'sheet' : 'doc';
  const content = kind === 'doc' && typeof body.content === 'string' ? body.content : '';
  const sheets = kind === 'sheet' && typeof body.sheets === 'string' ? body.sheets : '';
  const label = str(body.label, 80);
  const letterhead = kind === 'doc' ? letterheadOf(body.letterhead) : null;
  if (!label) return NextResponse.json({ error: 'Give the template a name.' }, { status: 400 });
  // A letterhead alone (a page design with no text, like a blank company letter) is a template too.
  if (!(content || sheets || letterhead)) return NextResponse.json({ error: 'The template is empty.' }, { status: 400 });
  if (Buffer.byteLength(content || sheets) > MAX_BYTES) return NextResponse.json({ error: 'This template is too large. Use a shorter file.' }, { status: 413 });
  try {
    const created = await createDoc(COLLECTION, {
      label, description: str(body.description, 300), category: str(body.category) || 'Templates', kind, content: content || (letterhead ? '<p></p>' : ''), sheets,
      ...(letterhead ? { letterhead } : {}), orientation: body.orientation === 'landscape' ? 'landscape' : 'portrait',
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
  const params = new URL(request.url).searchParams;
  const builtIn = params.get('builtin');
  if (builtIn) {
    if ((await getWorkstationAccess(auth.session)).kind !== 'ceo') return NextResponse.json({ error: 'Only the CEO can remove built-in templates.' }, { status: 403 });
    if (KEEP.has(builtIn)) return NextResponse.json({ error: 'The blank templates always stay.' }, { status: 400 });
    const hidden = await hiddenBuiltIns();
    if (!hidden.includes(builtIn) && !(await saveHidden([...hidden, builtIn.slice(0, 60)]))) {
      return NextResponse.json({ error: 'The template could not be removed.' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }
  const id = params.get('id') ?? '';
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
