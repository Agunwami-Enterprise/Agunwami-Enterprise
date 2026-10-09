/**
 * /api/ceo/projects/notifications
 *
 * GET: project-wide notifications reported by each project's metrics
 * endpoint, newest first (CEO only).
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { ProjectsService } from '@/backend/modules/projects';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json({ notifications: await ProjectsService.getProjectNotifications() });
  } catch (err) {
    console.error('[/api/ceo/projects/notifications]', err);
    return NextResponse.json({ error: 'Could not load project notifications.' }, { status: 500 });
  }
}
