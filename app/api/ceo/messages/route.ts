/**
 * /api/ceo/messages
 *
 * GET: Lists executive chat channels or channel messages.
 * POST: Sends an executive message.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { MessagesService } from '@/backend/modules/messages';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const channelId = searchParams.get('channelId');

    if (channelId) {
      const messages = await MessagesService.getChannelMessages(channelId);
      return NextResponse.json(messages);
    }

    const channels = await MessagesService.getExecutiveChannels();
    return NextResponse.json(channels);
  } catch (err: any) {
    console.error('[/api/ceo/messages] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const created = await MessagesService.sendMessage(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error('[/api/ceo/messages POST] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
