/**
 * /api/ceo/notifications
 *
 * GET: Lists announcements or executive notifications.
 * POST: Broadcasts a new corporate announcement.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { NotificationsService } from '@/backend/modules/notifications';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'announcements') {
      const announcements = await NotificationsService.getAnnouncements();
      return NextResponse.json(announcements);
    }

    const notifs = await NotificationsService.getNotifications();
    return NextResponse.json(notifs);
  } catch (err: any) {
    console.error('[/api/ceo/notifications] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const created = await NotificationsService.createBroadcastAnnouncement(body, auth.session);
    if (!created) {
      return NextResponse.json({ error: 'Failed to broadcast announcement' }, { status: 400 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[/api/ceo/notifications POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
