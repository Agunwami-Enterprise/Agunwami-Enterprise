import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

const SESSION_COOKIE = 'ae_session';
const SESSION_DURATION_S = 14 * 24 * 60 * 60;
// Auth + /users now live in a separate Firebase project — see lib/firebase-auth.ts.
const PROJECT_ID = process.env.NEXT_PUBLIC_AUTH_FIREBASE_PROJECT_ID!;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  ),
);

async function verifyFirebaseToken(idToken: string) {
  const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
    issuer: `https://securetoken.google.com/${PROJECT_ID}`,
    audience: PROJECT_ID,
  });
  return payload;
}

async function getUserRole(uid: string, idToken: string): Promise<string> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`No user profile found — create users/${uid} in Firestore.`);
  const doc = await res.json();
  return (doc.fields?.role?.stringValue as string) ?? 'staff';
}

const getSecret = () => new TextEncoder().encode(process.env.SESSION_SECRET!);

export type SessionPayload = { uid: string; email: string; role: string };

export async function createSession(idToken: string): Promise<SessionPayload> {
  const token = await verifyFirebaseToken(idToken);
  const uid = token.sub!;
  const email = (token['email'] as string) ?? '';
  const role = await getUserRole(uid, idToken);

  const sessionToken = await new SignJWT({ uid, email, role })
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

  return { uid, email, role };
}

export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as unknown as SessionPayload;
  } catch {
    redirect('/login');
  }
});
