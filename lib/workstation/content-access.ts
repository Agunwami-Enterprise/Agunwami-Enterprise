/**
 * Who may use the website C-panel (/cpanel): the CEO and the content
 * departments.
 */

export const CONTENT_DEPARTMENTS = ['content-admin', 'content-staff'];

export function canEditWebsite(session: { role?: string; department?: string } | null | undefined): boolean {
  if (!session) return false;
  if (session.role?.toLowerCase() === 'ceo') return true;
  return CONTENT_DEPARTMENTS.includes(session.department?.toLowerCase() ?? '');
}

/** Where a user lands after signing in to AE-WS. */
export function workstationHome(session: { role?: string; department?: string }): string {
  return session.role?.toLowerCase() !== 'ceo' && canEditWebsite(session) ? '/cpanel/dashboard' : '/ceo/dashboard';
}
