/**
 * Sending someone back to their own workstation when they open a part of the
 * AE Workstation they don't have (another workstation, a page their
 * department doesn't have, the C-panel). The redirect carries `?denied=…`,
 * and the workstation shows a warning toast for it (see AccessDeniedToast).
 */

import { pageById } from './pages';

export const DENIED_PARAM = 'denied';

/** What was denied: "ceo" (the CEO Workstation), "ws" (a department workstation), "cpanel", "document", or a /ws page id. */
export function deniedHref(home: string, what: string): string {
  const url = new URL(home, 'http://local');
  url.searchParams.set(DENIED_PARAM, what);
  return `${url.pathname}${url.search}`;
}

/** The warning shown for a `?denied=…` value. */
export function deniedMessage(what: string): string {
  if (what === 'ceo') return 'You don’t have access to the CEO Workstation, so you’ve been taken back to your own workstation.';
  if (what === 'ws') return 'That page is in a department workstation, which you’re not part of. You’re back in the CEO Workstation.';
  if (what === 'document') return 'You don’t have access to that document. Ask its owner to share it with you or your department.';
  if (what === 'cpanel') return 'You don’t have access to the Website C-panel. Ask the CEO if you need it.';
  const page = pageById(what);
  return page
    ? `Your department doesn’t have access to ${page.label}. Ask the CEO if you need it.`
    : 'You don’t have access to that page, so you’ve been taken back to your workstation.';
}
