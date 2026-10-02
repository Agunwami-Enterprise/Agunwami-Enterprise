/**
 * /api/ceo/analytics
 *
 * GET: Comprehensive CEO Enterprise Analytics.
 * Ingests project endpoints (tasks, departments, staff performance, financials)
 * and direct Firestore telemetry.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { AnalyticsService } from '@/backend/modules/analytics';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');
    const project = searchParams.get('project') || undefined;
    const department = searchParams.get('department') || undefined;

    if (mode === 'departments') {
      const depts = await AnalyticsService.getDepartmentMetrics();
      return NextResponse.json(depts);
    }

    if (mode === 'executive') {
      const exec = await AnalyticsService.getExecutiveAnalytics();
      return NextResponse.json(exec);
    }

    // Default: Complete CEO Analytics Payload with project & department filters
    const analytics = await AnalyticsService.getCeoAnalytics(project, department);
    return NextResponse.json(analytics);
  } catch (err: any) {
    console.error('[/api/ceo/analytics] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
