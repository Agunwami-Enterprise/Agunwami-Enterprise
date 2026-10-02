/**
 * api-auth.ts
 * Server-only helper for verifying CEO session in API route handlers.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { getDoc } from '@/backend/core/firestore';

const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export interface ApiSession {
  uid: string;
  email: string;
  role: string;
}

/**
 * Verifies the ae_session cookie and confirms the user is in the CEO department.
 */
export async function requireCeoSession(): Promise<
  { session: ApiSession; error?: never } | { session?: never; error: NextResponse }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ae_session')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  let session: ApiSession;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as Partial<ApiSession>;
    if (typeof p.uid !== 'string' || typeof p.email !== 'string' || typeof p.role !== 'string') {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    session = p as ApiSession;
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  let profile;
  try {
    profile = await getDoc('users', session.uid);
  } catch (err) {
    console.error('[api-auth] Unable to verify CEO profile using server credentials:', err);
    return { error: NextResponse.json({ error: 'Authorization service is unavailable.' }, { status: 503 }) };
  }
  const isCeo =
    String(profile?.role || '').toLowerCase() === 'ceo' ||
    String(profile?.department || profile?.dept || '').toLowerCase() === 'ceo';
  if (!isCeo) {
    return { error: NextResponse.json({ error: 'CEO access required.' }, { status: 403 }) };
  }
  return { session };
}
