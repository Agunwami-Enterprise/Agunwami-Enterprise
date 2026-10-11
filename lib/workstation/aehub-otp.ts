'use client';

/**
 * Emailed verification codes through AE Hub's sendAdminOTP / verifyAdminOTP
 * Cloud Functions (the workstation shares AE Hub's Firebase project). Used
 * while setting up or turning off 2FA in Settings; at sign-in the server
 * sends and checks codes itself (lib/workstation/two-factor.ts).
 */

import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app, 'us-central1');

function friendlyMessage(err: unknown, fallback: string): string {
  const message = (err as { message?: string })?.message ?? '';
  const lower = message.toLowerCase();
  if (lower.includes('expired')) return 'Verification code has expired. Please request a new code.';
  if (lower.includes('invalid') || lower.includes('no active')) return 'Invalid verification code. Please check and try again.';
  if (lower.includes('permission') || lower.includes('restricted')) return 'This account is not allowed to receive verification codes.';
  if (lower.includes('not found')) return 'No account was found for that email address.';
  return message || fallback;
}

export async function sendStaffOTP(email: string): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await httpsCallable<{ email: string }, { success?: boolean; message?: string }>(functions, 'sendAdminOTP')({
      email: email.toLowerCase().trim(),
    });
    if (!res.data?.success) throw new Error('The verification code could not be sent.');
    return { success: true, message: res.data.message };
  } catch (err) {
    throw new Error(friendlyMessage(err, 'The verification code could not be sent. Please try again.'));
  }
}

export async function verifyStaffOTP(email: string, code: string): Promise<{ success: boolean }> {
  try {
    const res = await httpsCallable<{ email: string; code: string }, { success?: boolean }>(functions, 'verifyAdminOTP')({
      email: email.toLowerCase().trim(),
      code: code.trim(),
    });
    if (!res.data?.success) throw new Error('Invalid verification code.');
    return { success: true };
  } catch (err) {
    throw new Error(friendlyMessage(err, 'Invalid verification code. Please check and try again.'));
  }
}
