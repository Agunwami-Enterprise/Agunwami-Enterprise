import { redirect } from 'next/navigation';
import { verifySession } from '@/lib/workstation/session';
import { canEditWebsite } from '@/lib/workstation/content-access';

/** The CEO edits projects here; the content team uses the same editor in the C-panel. */
export async function requireCeoProjectAccess(path: string): Promise<void> {
  const session = await verifySession();
  if (session.role.toLowerCase() === 'ceo') return;
  redirect(canEditWebsite(session)
    ? path.replace(/^\/ceo\/projects/, '/cpanel/projects').replace(/\/edit$/, '')
    : '/ceo/dashboard');
}
