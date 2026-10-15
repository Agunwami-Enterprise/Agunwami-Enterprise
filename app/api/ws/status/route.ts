/**
 * GET /api/ws/status[?refresh=1]
 *
 * Technical Status: the Agunwami Enterprise website and each project's site,
 * checked from the server (status, response time, SSL expiry, 24-hour
 * uptime). For departments with the Technical Status page.
 */

import { NextResponse } from 'next/server';
import { requireWorkstationPage } from '@/lib/workstation/api-auth';
import { StatusService } from '@/backend/modules/status';

export async function GET(request: Request) {
  const auth = await requireWorkstationPage('technical-status');
  if (auth.error) return auth.error;
  try {
    const refresh = new URL(request.url).searchParams.get('refresh') === '1';
    return NextResponse.json({ sites: await StatusService.getStatus(refresh) });
  } catch (err) {
    console.error('[/api/ws/status] error:', err);
    return NextResponse.json({ error: 'Status checks could not be run.' }, { status: 500 });
  }
}
