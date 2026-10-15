/**
 * /api/ceo/training
 *
 * GET: The Training page list: the enterprise's courses plus each project's
 *      reported training, labelled by source. `?mode=summary` returns stats.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { TrainingService } from '@/backend/modules/training';
import { getTrainingFeed } from '@/backend/modules/training/training.feed';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    if (new URL(request.url).searchParams.get('mode') === 'summary') {
      return NextResponse.json(await TrainingService.getTrainingSummary());
    }
    return NextResponse.json(await getTrainingFeed());
  } catch (err) {
    console.error('[/api/ceo/training] error:', err);
    return NextResponse.json({ error: (err instanceof Error && err.message) || 'Internal error' }, { status: 500 });
  }
}
