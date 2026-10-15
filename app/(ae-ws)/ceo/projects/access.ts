import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/workstation/session';
import { getWorkstationAccess } from '@/lib/workstation/access';

/** The CEO edits projects here; the content team uses the same editor in the C-panel. */
export async function requireCeoProjectAccess(path: string): Promise<void> {
  const session = await verifySession();
  const access = await getWorkstationAccess(session);
  if (access.kind === 'ceo') return;
  redirect(access.canEditWebsite
    ? path.replace(/^\/ceo\/projects/, '/cpanel/projects').replace(/\/edit$/, '')
    : access.home);
}
