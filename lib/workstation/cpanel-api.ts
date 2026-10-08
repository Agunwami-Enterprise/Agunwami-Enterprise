/**
 * Shared plumbing for the /api/cpanel route handlers.
 */

import 'server-only';
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { requireContentSession } from './api-auth';
import { clearPublicContentCache } from '@/lib/site/content-cache';
import { SiteContentNotFoundError, SiteContentValidationError } from '@/backend/modules/site-content';

export type IdParams = { params: Promise<{ id: string }> };

/**
 * Runs `action` for a signed-in website editor and turns its result or error
 * into a JSON response. Changes (`mutates`) refresh every public page.
 */
export async function cpanelHandler<T>(
  action: () => Promise<T>,
  { mutates = false, status = 200 }: { mutates?: boolean; status?: number } = {},
): Promise<NextResponse> {
  const auth = await requireContentSession();
  if (auth.error) return auth.error;
  return runContentAction(action, { mutates, status, logLabel: 'cpanel' });
}

export async function runContentAction<T>(
  action: () => Promise<T>,
  { mutates = false, status = 200, logLabel }: { mutates?: boolean; status?: number; logLabel: string },
): Promise<NextResponse> {
  try {
    const result = await action();
    // Show edits on the public site right away.
    if (mutates) {
      clearPublicContentCache();
      revalidatePath('/', 'layout');
    }
    return NextResponse.json(result ?? { success: true }, { status });
  } catch (err) {
    if (err instanceof SiteContentValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof SiteContentNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error(`[/api/${logLabel}]`, err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new SiteContentValidationError('Send the data as a JSON object.');
  }
  return body as Record<string, unknown>;
}
