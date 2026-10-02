/**
 * /api/ceo/settings
 *
 * GET: Retrieves executive profile and enterprise settings.
 * PATCH: Updates executive profile.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { SettingsService } from '@/backend/modules/settings';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'enterprise') {
      const enterprise = await SettingsService.getEnterpriseSettings();
      return NextResponse.json(enterprise);
    }

    const profile = await SettingsService.getExecutiveProfile(auth.session.uid, auth.session.email);
    return NextResponse.json(profile);
  } catch (err: any) {
    console.error('[/api/ceo/settings] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const success = await SettingsService.updateProfile(auth.session.uid, body);
    return NextResponse.json({ success });
  } catch (err: any) {
    console.error('[/api/ceo/settings PATCH] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
