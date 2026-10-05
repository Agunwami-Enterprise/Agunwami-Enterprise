/**
 * GET /api/ceo/activity-feed
 *
 * Real chronological activity feed for the CEO dashboard.
 * Powered by backend/services/activity.service.ts.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getActivityFeed } from '@/backend/services/activity.service';

export async function GET(req: NextRequest) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  const url = req.nextUrl;
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '8', 10), 20);

  try {
    const feed = await getActivityFeed(limit);
    return NextResponse.json({ feed });
  } catch (err: any) {
    console.error('[/api/ceo/activity-feed] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
