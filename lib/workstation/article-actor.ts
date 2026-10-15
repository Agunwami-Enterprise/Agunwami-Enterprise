/**
 * The signed-in person as an article actor: their uid, name and email, and
 * whether they're the CEO (who may delete any article).
 */

import 'server-only';
import { CeoApprovals, DepartmentsService } from '@/backend/modules/departments';
import type { ArticleActor } from '@/backend/modules/site-content';
import { getWorkstationAccess } from './access';

export async function articleActor(session: { uid: string; email: string; role?: string; department?: string }): Promise<ArticleActor> {
  const [access, membership, ceos] = await Promise.all([
    getWorkstationAccess(session),
    DepartmentsService.membershipOf(session.uid).catch(() => null),
    CeoApprovals.list().catch(() => []),
  ]);
  const name = membership?.member.name || ceos.find(c => c.uid === session.uid)?.name || session.email;
  return { uid: session.uid, name, email: session.email, isCeo: access.kind === 'ceo' };
}
