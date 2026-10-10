/**
 * /api/ceo/time-tracking
 *
 * GET: Today's attendance reported by each project, labelled by project.
 *      `?mode=summary`, `?mode=departments` and `?mode=logs` return the older
 *      attendance views from the enterprise's attendanceLogs.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { TimeTrackingService } from '@/backend/modules/time-tracking';
import { getTimeTrackingFeed } from '@/backend/modules/time-tracking/time-tracking.feed';

type AttendanceStatus = NonNullable<Parameters<typeof TimeTrackingService.getAttendanceLogs>[0]>['status'];

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'summary') {
      return NextResponse.json(await TimeTrackingService.getTodaySummary());
    }
    if (mode === 'departments') {
      return NextResponse.json(await TimeTrackingService.getDepartmentBreakdown());
    }
    if (mode === 'logs') {
      return NextResponse.json(await TimeTrackingService.getAttendanceLogs({
        date: searchParams.get('date') || undefined,
        department: searchParams.get('department') || undefined,
        status: (searchParams.get('status') || undefined) as AttendanceStatus,
      }));
    }
    return NextResponse.json(await getTimeTrackingFeed());
  } catch (err) {
    console.error('[/api/ceo/time-tracking] error:', err);
    return NextResponse.json({ error: (err instanceof Error && err.message) || 'Internal error' }, { status: 500 });
  }
}
