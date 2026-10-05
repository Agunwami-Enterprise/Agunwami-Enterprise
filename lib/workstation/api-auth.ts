/**
 * api-auth.ts
 * Server-only helper for verifying CEO session in API route handlers.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';

const DEFAULT_SESSION_SECRET = 'agunwami_enterprise_ae_workstation_secret_key_2026_super_secure';
const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET);

export interface ApiSession {
  uid: string;
  email: string;
  role: string;
}

/**
 * Verifies the signed session and the CEO role resolved during login.
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

  if (session.role.toLowerCase() !== 'ceo') {
    return { error: NextResponse.json({ error: 'CEO access required.' }, { status: 403 }) };
  }
  return { session };
}
