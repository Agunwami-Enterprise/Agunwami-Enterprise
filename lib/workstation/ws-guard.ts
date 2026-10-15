/**
 * Server-side page checks for the department workstation (/ws): a page opens
 * only if the person's AE department has it (the CEO can open everything).
 */

import 'server-only';
import { redirect } from 'next/navigation';
import { verifySession } from './session';
import { canOpenPage, getWorkstationAccess, type WorkstationAccess } from './access';

export async function requireWsPage(pageId: string): Promise<WorkstationAccess> {
  const session = await verifySession();
  const access = await getWorkstationAccess(session);
  if (!canOpenPage(access, pageId)) redirect('/ws/dashboard');
  return access;
}
