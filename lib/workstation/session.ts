import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';
import { normalizeWorkstationRole } from './roles';
import { WORKSTATION_PROJECT_ID } from './workstation-project';
import { CeoApprovals, type CeoClaim } from '@/backend/modules/departments/ceos.service';
import { invalidateAccess } from './access';

const SESSION_COOKIE = 'ae_session';
const SESSION_DURATION_S = 14 * 24 * 60 * 60;
// Auth + /users live in the workstation Firebase project — see lib/workstation/firebase.ts.
const PROJECT_ID = WORKSTATION_PROJECT_ID;
const DEFAULT_SESSION_SECRET = 'agunwami_enterprise_ae_workstation_secret_key_2026_super_secure';

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

export async function verifyFirebaseToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return payload;
}

async function getUserProfile(uid: string, idToken: string): Promise<{ role: string; department: string; name: string; ceoClaim: CeoClaim }> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`No user profile found — create users/${uid} in Firestore.`);
  const doc = await res.json();
  const role = doc.fields?.role?.stringValue ?? 'staff';
  const department = String(
    doc.fields?.department?.stringValue ?? doc.fields?.dept?.stringValue ?? '',
  );
  const normalizedDepartment = department.trim().toLowerCase();
  // Why a project lists them as CEO: AE Hub's CEO role, or its CEO office.
  const ceoClaim: CeoClaim = role.trim().toLowerCase() === 'ceo' || doc.fields?.isCEO?.booleanValue === true
    ? 'ceo'
    : normalizedDepartment === 'ceo' ? 'ceo-office' : '';
  const name = String(doc.fields?.displayName?.stringValue ?? doc.fields?.name?.stringValue ?? '');
  return { role: ceoClaim ? 'ceo' : normalizeWorkstationRole(role, department), department: normalizedDepartment, name, ceoClaim };
}

const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET || DEFAULT_SESSION_SECRET);

// department is missing from sessions created before the C-panel existed.
export type SessionPayload = { uid: string; email: string; role: string; department?: string };

export async function createSession(idToken: string): Promise<SessionPayload> {
  const token = await verifyFirebaseToken(idToken);
  const uid = token.sub!;
  const email = (token['email'] as string) ?? '';
  const { role, department, name, ceoClaim } = await getUserProfile(uid, idToken);
  // Puts project CEOs on AE's waiting list (or makes the first one the official CEO).
  await CeoApprovals.onSignIn({ uid, email, name }, ceoClaim).catch(err => {
    console.error('[session] Recording CEO sign-in failed:', err);
  });
  invalidateAccess(uid);

  const sessionToken = await new SignJWT({ uid, email, role, department })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_S}s`)
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_DURATION_S,
    sameSite: 'lax',
    path: '/',
  });

  return { uid, email, role, department };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/auth/login');
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    redirect('/auth/login');
  }
});
