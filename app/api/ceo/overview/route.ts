/**
 * GET /api/ceo/overview
 *
 * Aggregated KPI metrics for the CEO dashboard top cards.
 * Data is fetched from real AEHub Firestore collections via backend/services/overview.service.ts.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getOverviewMetrics } from '@/backend/services/overview.service';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const data = await getOverviewMetrics();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[/api/ceo/overview] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
