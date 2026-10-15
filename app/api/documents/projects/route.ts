/**
 * GET /api/documents/projects: the projects a document or file can be filed
 * under (id, name, colour), for anyone signed in to the workstation.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { listProjectRecords } from '@/backend/modules/projects/projects.service';

export async function GET() {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const projects = (await listProjectRecords())
      .map(p => ({ id: String(p._id || p.id || ''), name: String(p.name || ''), color: typeof p.color === 'string' ? p.color : null }))
      .filter(p => p.id && p.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[GET /api/documents/projects]', err);
    return NextResponse.json({ error: 'Projects could not be loaded.' }, { status: 500 });
  }
}
