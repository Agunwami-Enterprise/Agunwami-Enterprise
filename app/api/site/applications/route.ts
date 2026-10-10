/**
 * /api/site/applications
 *
 * POST: public submission of the /partnerships/apply form. No sign-in, so
 * it is rate limited per IP and has a honeypot field (`hpTrap`) that only
 * bots fill in. It must not be named like a real field such as `company`:
 * browsers autofill those even when hidden, which silently drops real
 * applications.
 */

import { NextResponse } from 'next/server';
import { readJson, runContentAction } from '@/lib/workstation/cpanel-api';
import { submitApplication } from '@/backend/modules/site-content';

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter(time => now - time < WINDOW_MS);
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 5000) recent.clear();
  return hits.length > MAX_PER_WINDOW;
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) {
    return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 });
  }
  return runContentAction(
    async () => {
      const body = await readJson(request);
      // Pretend success to bots that fill the hidden field.
      if (typeof body.hpTrap === 'string' && body.hpTrap.trim()) {
        console.warn(`[site/applications] Honeypot filled; discarded a submission from ${ip}.`);
        return { id: 'received' };
      }
      const application = await submitApplication(body);
      return { id: application.id };
    },
    { status: 201, logLabel: 'site/applications' },
  );
}
