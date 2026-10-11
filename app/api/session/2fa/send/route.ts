/**
 * POST { idToken }: emails a sign-in code (via AE Hub) to the address saved
 * with the account's 2FA, for accounts using the emailed-code method. The
 * address comes from the account's settings, never from the request.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseToken } from '@/lib/workstation/session';
import { TwoFactorError, maskEmail, readSecuritySettings, sendEmailCode } from '@/lib/workstation/two-factor';

const RESEND_COOLDOWN_MS = 30_000;
const lastSent = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json() as { idToken?: unknown };
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'Missing sign-in token.' }, { status: 400 });
    }
    const token = await verifyFirebaseToken(idToken).catch(() => null);
    if (!token?.sub) return NextResponse.json({ error: 'Your sign-in has expired. Please sign in again.' }, { status: 401 });

    const security = await readSecuritySettings(token.sub, idToken);
    if (!security.enabled || security.method !== 'otp') {
      return NextResponse.json({ error: 'This account does not use emailed codes.' }, { status: 400 });
    }

    const since = Date.now() - (lastSent.get(token.sub) ?? 0);
    if (since < RESEND_COOLDOWN_MS) {
      return NextResponse.json({ error: `Please wait ${Math.ceil((RESEND_COOLDOWN_MS - since) / 1000)} seconds before requesting another code.` }, { status: 429 });
    }
    const destination = await sendEmailCode(security, typeof token.email === 'string' ? token.email : '', idToken);
    lastSent.set(token.sub, Date.now());
    if (lastSent.size > 10_000) lastSent.clear();
    return NextResponse.json({ sent: true, destination: maskEmail(destination) });
  } catch (err) {
    if (err instanceof TwoFactorError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error('[/api/session/2fa/send]', err);
    return NextResponse.json({ error: 'The code could not be sent. Please try again.' }, { status: 500 });
  }
}
