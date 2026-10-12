/**
 * What a signed-in person can open in the AE Workstation.
 *
 * - The CEO (the one predefined department) gets everything at /ceo.
 * - Everyone else gets the pages of the AE department the CEO put them in
 *   (Departments page), at /ws. An inactive department keeps only the base
 *   pages.
 * - Someone in no AE department yet sees a "not assigned" page at /ws.
 *
 * Looked up on the server on each request (cached briefly), so a change on the
 * Departments page applies within seconds without signing in again.
 */

import 'server-only';
import { DepartmentsService } from '@/backend/modules/departments';
import { isLegacyContentStaff } from './content-access';
import { computeAccess, type SessionLike, type WorkstationAccess } from './access-rules';

export { canOpenPage, type WorkstationAccess } from './access-rules';

const CACHE_MS = 15_000;
const cache = new Map<string, { value: WorkstationAccess; expires: number }>();

/** Drops cached access, e.g. after the CEO changes a department. */
export function invalidateAccess(uid?: string): void {
  if (uid) cache.delete(uid);
  else cache.clear();
}

export async function getWorkstationAccess(session: SessionLike): Promise<WorkstationAccess> {
  if (session.role?.toLowerCase() === 'ceo') return computeAccess(session, null, false);

  const cached = cache.get(session.uid);
  if (cached && cached.expires > Date.now()) return cached.value;

  const membership = await DepartmentsService.membershipOf(session.uid).catch(err => {
    console.error('[access] Department lookup failed:', err);
    return null;
  });
  // Until the content team is put in an AE department with the Website
  // C-panel page, their AE Hub department keeps their C-panel access.
  const legacyContent = isLegacyContentStaff(session);

  const value = computeAccess(session, membership, legacyContent);

  cache.set(session.uid, { value, expires: Date.now() + CACHE_MS });
  if (cache.size > 5000) cache.clear();
  return value;
}
