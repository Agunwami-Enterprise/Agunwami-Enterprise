/**
 * What a signed-in person can open in the AE Workstation.
 *
 * - Approved CEOs (ceos.service.ts) get everything at /ceo. Someone a project
 *   lists as CEO waits for the official CEO's approval, unless they're in an
 *   AE department.
 * - Everyone else gets the pages of the AE department the CEO put them in
 *   (Departments page), at /ws. An inactive department keeps only the base
 *   pages.
 * - Someone in no AE department yet sees a "not assigned" page at /ws.
 *
 * Looked up on the server on each request (cached briefly), so a change on the
 * Departments page applies within seconds without signing in again.
 */

import 'server-only';
import { CeoApprovals, DepartmentsService, invalidateCeos } from '@/backend/modules/departments';
import { isLegacyContentStaff } from './content-access';
import { computeAccess, type SessionLike, type WorkstationAccess } from './access-rules';

export { canOpenPage, type WorkstationAccess } from './access-rules';

const CACHE_MS = 15_000;
const cache = new Map<string, { value: WorkstationAccess; expires: number }>();

/** Drops cached access, e.g. after the CEO changes a department. */
export function invalidateAccess(uid?: string): void {
  if (uid) cache.delete(uid);
  else {
    cache.clear();
    invalidateCeos();
  }
}

export async function getWorkstationAccess(session: SessionLike): Promise<WorkstationAccess> {
  const cached = cache.get(session.uid);
  if (cached && cached.expires > Date.now()) return cached.value;

  // A session role of "ceo" means a project lists them as CEO; AE's approved list decides.
  const ceo = await CeoApprovals.accessOf(session.uid, session.role?.toLowerCase() === 'ceo');
  if (ceo === 'ceo') {
    const value = computeAccess(session, null, false, 'ceo');
    cache.set(session.uid, { value, expires: Date.now() + CACHE_MS });
    return value;
  }

  const membership = await DepartmentsService.membershipOf(session.uid).catch(err => {
    console.error('[access] Department lookup failed:', err);
    return null;
  });
  // Until the content team is put in an AE department with the Website
  // C-panel page, their AE Hub department keeps their C-panel access.
  const legacyContent = isLegacyContentStaff(session);

  const value = computeAccess(session, membership, legacyContent, ceo);

  cache.set(session.uid, { value, expires: Date.now() + CACHE_MS });
  if (cache.size > 5000) cache.clear();
  return value;
}
