/**
 * api-auth.ts
 * Server-only helpers for verifying the workstation session in API route handlers.
 */

import 'server-only';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { canEditWebsite } from './content-access';

const DEFAULT_SESSION_SECRET = 'agunwami_enterprise_ae_workstation_secret_key_2026_super_secure';
const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET);

export interface ApiSession {
  uid: string;
  email: string;
  role: string;
  department?: string;
}

type SessionResult =
  | { session: ApiSession; error?: never }
  | { session?: never; error: NextResponse };

async function readApiSession(): Promise<SessionResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('ae_session')?.value;
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const p = payload as unknown as Partial<ApiSession>;
    if (typeof p.uid !== 'string' || typeof p.email !== 'string' || typeof p.role !== 'string') {
      return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { session: p as ApiSession };
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

/**
 * Verifies the signed session and the CEO role resolved during login.
 */
export async function requireCeoSession(): Promise<SessionResult> {
  const result = await readApiSession();
  if (result.error) return result;
  if (result.session.role.toLowerCase() !== 'ceo') {
    return { error: NextResponse.json({ error: 'CEO access required.' }, { status: 403 }) };
  }
  return result;
}

/**
 * Verifies the session belongs to someone allowed to edit the website
 * (the CEO or the content departments).
 */
export async function requireContentSession(): Promise<SessionResult> {
  const result = await readApiSession();
  if (result.error) return result;
  if (!canEditWebsite(result.session)) {
    return { error: NextResponse.json({ error: 'Website editing access required.' }, { status: 403 }) };
  }
  return result;
}
