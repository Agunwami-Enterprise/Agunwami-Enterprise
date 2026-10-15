/**
 * Server-side two-factor checks for workstation sign-in.
 *
 * 2FA settings are shared with AE Hub: users/{uid}/settings/security in the
 * workstation (AE Hub) Firebase project holds twoFactorEnabled, the method
 * ("app" = authenticator, "otp" = emailed code), the authenticator secret and
 * single-use backup codes. The server reads and updates that document with the
 * signed-in user's own ID token (the owner may read and write it), and emailed
 * codes are sent and checked by AE Hub's sendAdminOTP / verifyAdminOTP
 * functions. The session cookie is only issued after a code passes here, so the
 * check can't be skipped in the browser.
 */

import 'server-only';
import * as OTPAuth from 'otpauth';
import { WORKSTATION_PROJECT_ID } from './workstation-project';

const FUNCTIONS_REGION = 'us-central1';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

export type TwoFactorMethod = 'app' | 'otp';

export interface SecuritySettings {
  enabled: boolean;
  method: TwoFactorMethod;
  secret: string | null;
  backupCodes: string[];
  /** Where emailed codes go (AE Hub's twoFactorOtpDestination). */
  otpDestination: string | null;
}

export class TwoFactorError extends Error {
  constructor(message: string, readonly status = 401) {
    super(message);
    this.name = 'TwoFactorError';
  }
}

const securityDocUrl = (uid: string) =>
  `https://firestore.googleapis.com/v1/projects/${WORKSTATION_PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(uid)}/settings/security`;

type FirestoreValue = { stringValue?: string; booleanValue?: boolean; arrayValue?: { values?: FirestoreValue[] }; nullValue?: null };

/**
 * The user's 2FA settings. A missing document means 2FA is off; any other read
 * failure throws, so a Firestore outage can't silently turn 2FA off.
 */
export async function readSecuritySettings(uid: string, idToken: string): Promise<SecuritySettings> {
  const res = await fetch(securityDocUrl(uid), {
    headers: { Authorization: `Bearer ${idToken}` },
    cache: 'no-store',
  });
  if (res.status === 404) {
    return { enabled: false, method: 'app', secret: null, backupCodes: [], otpDestination: null };
  }
  if (!res.ok) {
    throw new TwoFactorError('Your two-factor settings could not be checked. Please try again.', 503);
  }
  const fields = ((await res.json()) as { fields?: Record<string, FirestoreValue> }).fields ?? {};
  const text = (key: string) => fields[key]?.stringValue?.trim() || null;
  return {
    enabled: fields.twoFactorEnabled?.booleanValue === true,
    method: text('twoFactorMethod') === 'otp' ? 'otp' : 'app',
    secret: text('twoFactorSecret'),
    backupCodes: (fields.backupCodes?.arrayValue?.values ?? [])
      .map(value => value.stringValue ?? '')
      .filter(Boolean),
    otpDestination: text('twoFactorOtpDestination'),
  };
}

// ── Attempt limiting (per server process) ───────────────────────────────────

const failures = new Map<string, { count: number; resetAt: number }>();

function assertNotLocked(uid: string) {
  const entry = failures.get(uid);
  if (entry && entry.resetAt > Date.now() && entry.count >= MAX_FAILED_ATTEMPTS) {
    const minutes = Math.ceil((entry.resetAt - Date.now()) / 60_000);
    throw new TwoFactorError(`Too many incorrect codes. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`, 429);
  }
}

function recordFailure(uid: string) {
  const now = Date.now();
  const entry = failures.get(uid);
  if (!entry || entry.resetAt <= now) failures.set(uid, { count: 1, resetAt: now + LOCKOUT_MS });
  else entry.count += 1;
  if (failures.size > 10_000) failures.clear();
}

// ── AE Hub callable functions ────────────────────────────────────────────────

async function callAeHubFunction(name: string, data: Record<string, unknown>, idToken: string): Promise<void> {
  const res = await fetch(`https://${FUNCTIONS_REGION}-${WORKSTATION_PROJECT_ID}.cloudfunctions.net/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ data }),
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null) as
    { result?: { success?: boolean }; error?: { message?: string; status?: string } } | null;
  if (res.ok && body?.result?.success) return;
  throw new TwoFactorError(body?.error?.message || `AE Hub ${name} failed (${res.status}).`, res.ok ? 502 : 401);
}

/** Masks an email for display: "ad***@example.com". */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, Math.min(5, name.length - 2)))}@${domain}`;
}

/** Emails a sign-in code through AE Hub to the address saved with the user's 2FA. */
export async function sendEmailCode(security: SecuritySettings, accountEmail: string, idToken: string): Promise<string> {
  const destination = (security.otpDestination || accountEmail).toLowerCase();
  if (!destination) throw new TwoFactorError('Your account has no email address for verification codes.', 400);
  await callAeHubFunction('sendAdminOTP', { email: destination }, idToken);
  return destination;
}

// ── Verification ─────────────────────────────────────────────────────────────

const normalizeBackupCode = (code: string) => code.replace(/[^0-9]/g, '');

/**
 * Checks a sign-in code: a 6-digit authenticator code, an emailed code, or a
 * single-use backup code (which is removed once used). Throws on failure.
 */
export async function verifySecondFactor(input: {
  uid: string;
  accountEmail: string;
  idToken: string;
  security: SecuritySettings;
  code: string;
}): Promise<void> {
  const { uid, accountEmail, idToken, security } = input;
  assertNotLocked(uid);
  const code = input.code.replace(/\s/g, '');

  try {
    // Backup codes ("1234-5678") work with the authenticator method.
    const backup = normalizeBackupCode(code);
    if (security.method === 'app' && backup.length === 8) {
      const index = security.backupCodes.findIndex(saved => normalizeBackupCode(saved) === backup);
      if (index === -1) throw new TwoFactorError('That backup code is not valid or has already been used.');
      await consumeBackupCode(uid, idToken, security.backupCodes.filter((_, i) => i !== index));
      failures.delete(uid);
      return;
    }

    if (!/^\d{6}$/.test(code)) throw new TwoFactorError('Enter the 6-digit code.');

    if (security.method === 'otp') {
      const destination = (security.otpDestination || accountEmail).toLowerCase();
      // AE Hub deletes the code once it is used, so each emailed code works once.
      await callAeHubFunction('verifyAdminOTP', { email: destination, code }, idToken);
      failures.delete(uid);
      return;
    }

    if (!security.secret) {
      throw new TwoFactorError('Your authenticator is not set up correctly. Use a backup code or ask an administrator to reset 2FA.');
    }
    const totp = new OTPAuth.TOTP({
      algorithm: 'SHA1', digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(security.secret),
    });
    if (totp.validate({ token: code, window: 1 }) === null) {
      throw new TwoFactorError('That code is not correct. Check your authenticator app and try again.');
    }
    failures.delete(uid);
  } catch (err) {
    if (err instanceof TwoFactorError && err.status === 401) recordFailure(uid);
    throw err;
  }
}

async function consumeBackupCode(uid: string, idToken: string, remaining: string[]): Promise<void> {
  const res = await fetch(`${securityDocUrl(uid)}?updateMask.fieldPaths=backupCodes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({
      fields: { backupCodes: { arrayValue: { values: remaining.map(value => ({ stringValue: value })) } } },
    }),
    cache: 'no-store',
  });
  if (!res.ok) throw new TwoFactorError('The backup code could not be used. Please try again.', 503);
}
