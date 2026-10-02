/**
 * /api/ceo/time-tracking
 *
 * GET: Returns attendance summary or detailed logs from real AEHub Firestore.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { TimeTrackingService } from '@/backend/modules/time-tracking';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'summary') {
      const summary = await TimeTrackingService.getTodaySummary();
      return NextResponse.json(summary);
    }

    if (mode === 'departments') {
      const breakdown = await TimeTrackingService.getDepartmentBreakdown();
      return NextResponse.json(breakdown);
    }

    const date = searchParams.get('date') || undefined;
    const department = searchParams.get('department') || undefined;
    const status = (searchParams.get('status') as any) || undefined;

    const logs = await TimeTrackingService.getAttendanceLogs({ date, department, status });
    return NextResponse.json(logs);
  } catch (err: any) {
    console.error('[/api/ceo/time-tracking] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
