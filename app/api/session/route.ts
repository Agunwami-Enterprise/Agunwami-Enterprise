import { type NextRequest, NextResponse } from 'next/server';
import { createSession, deleteSession, verifyFirebaseToken } from '@/lib/workstation/session';
import { workstationHome } from '@/lib/workstation/content-access';
import {
  TwoFactorError, maskEmail, readSecuritySettings, verifySecondFactor,
} from '@/lib/workstation/two-factor';

/**
 * POST { idToken, code? }: signs in to the workstation. When the account has
 * two-factor authentication on, no session is created until `code` (an
 * authenticator, emailed or backup code) is verified; without it the response
 * is 401 { requires2FA, method, destination }.
 */
export async function POST(req: NextRequest) {
  try {
    const { idToken, code } = await req.json() as { idToken?: unknown; code?: unknown };
    if (typeof idToken !== 'string' || !idToken) {
      return NextResponse.json({ error: 'Missing sign-in token.' }, { status: 400 });
    }

    const token = await verifyFirebaseToken(idToken).catch(() => null);
    if (!token?.sub) return NextResponse.json({ error: 'Your sign-in has expired. Please sign in again.' }, { status: 401 });
    const uid = token.sub;
    const email = typeof token.email === 'string' ? token.email : '';

    const security = await readSecuritySettings(uid, idToken);
    if (security.enabled) {
      const challenge = {
        requires2FA: true,
        method: security.method,
        ...(security.method === 'otp' ? { destination: maskEmail(security.otpDestination || email) } : {}),
        backupCodesAvailable: security.method === 'app' && security.backupCodes.length > 0,
      };
      if (typeof code !== 'string' || !code.trim()) {
        return NextResponse.json(challenge, { status: 401 });
      }
      try {
        await verifySecondFactor({ uid, accountEmail: email, idToken, security, code });
      } catch (err) {
        if (err instanceof TwoFactorError) {
          return NextResponse.json({ ...challenge, error: err.message }, { status: err.status });
        }
        throw err;
      }
    }

    const session = await createSession(idToken);
    return NextResponse.json({ role: session.role, home: workstationHome(session) });
  } catch (err) {
    if (err instanceof TwoFactorError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/session]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await deleteSession();
  return NextResponse.json({ status: 'ok' });
}
