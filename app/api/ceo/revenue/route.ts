/**
 * GET /api/ceo/revenue
 *
 * 6-Month revenue trend data for the CEO dashboard.
 * Powered by backend/services/revenue.service.ts.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { getRevenueTrend } from '@/backend/services/revenue.service';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const data = await getRevenueTrend();
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[/api/ceo/revenue] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
