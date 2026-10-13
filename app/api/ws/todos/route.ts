/**
 * /api/ws/todos
 *
 * The signed-in person's own to-do list (Tasks → My To-do), kept in the
 * enterprise project (aeTodos/{uid}).
 * GET: the list. PUT { items }: replace it (up to 200 items).
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { getDoc, updateDoc } from '@/backend/core/firestore';
import { readJson } from '@/app/api/ceo/departments/shared';

export interface TodoItem { id: string; text: string; done: boolean; createdAt: string }

function clean(value: unknown): TodoItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 200).flatMap(item => {
    const r = item as Record<string, unknown>;
    const text = String(r?.text ?? '').trim().slice(0, 300);
    const id = String(r?.id ?? '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
    return text && id ? [{ id, text, done: r.done === true, createdAt: typeof r.createdAt === 'string' ? r.createdAt.slice(0, 40) : new Date().toISOString() }] : [];
  });
}

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const doc = await getDoc('aeTodos', auth.session.uid).catch(() => null);
  return NextResponse.json({ items: clean(doc?.items) });
}

export async function PUT(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  const items = clean((await readJson(request)).items);
  const saved = await updateDoc('aeTodos', auth.session.uid, { items, updatedAt: new Date().toISOString() });
  if (!saved) return NextResponse.json({ error: 'Your to-do list could not be saved. Please try again.' }, { status: 503 });
  return NextResponse.json({ items });
}
