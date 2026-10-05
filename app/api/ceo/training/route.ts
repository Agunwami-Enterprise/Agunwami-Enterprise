/**
 * /api/ceo/training
 *
 * GET: Lists courses or training summary stats from real AEHub Firestore.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { TrainingService } from '@/backend/modules/training';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'summary') {
      const summary = await TrainingService.getTrainingSummary();
      return NextResponse.json(summary);
    }

    const courses = await TrainingService.getCourses();
    return NextResponse.json(courses);
  } catch (err: any) {
    console.error('[/api/ceo/training] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
