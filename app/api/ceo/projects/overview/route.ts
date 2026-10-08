/**
 * GET /api/ceo/projects/overview
 *
 * Live project metadata for the CEO dashboard project cards.
 * Endpoint responses are cached briefly; `?refresh=1` re-reads every project now.
 * Powered by backend/services/projects.service.ts.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getProjectsOverview } from '@/backend/services/projects.service';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const forceRefresh = new URL(request.url).searchParams.get('refresh') === '1';
    const projects = await getProjectsOverview(forceRefresh);
    return NextResponse.json({ projects });
  } catch (err: unknown) {
    console.error('[/api/ceo/projects/overview] error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message || 'Internal error' }, { status: 500 });
  }
}
