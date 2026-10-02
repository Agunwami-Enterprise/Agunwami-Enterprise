/**
 * GET /api/ceo/projects/overview
 *
 * Live project metadata for all 4 CEO dashboard project cards.
 * Powered by backend/services/projects.service.ts.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getProjectsOverview } from '@/backend/services/projects.service';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const projects = await getProjectsOverview();
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error('[/api/ceo/projects/overview] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
