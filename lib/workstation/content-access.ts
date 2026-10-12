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

/**
 * The Technical team's workstation (/tech): staff in AE Hub's technical
 * departments, and the CEO.
 */
export const TECH_DEPARTMENTS = ['developers', 'it'];

export function isTechnicalStaff(session: { role?: string; department?: string } | null | undefined): boolean {
  return TECH_DEPARTMENTS.includes(session?.department?.toLowerCase() ?? '');
}

export function canUseTechWorkstation(session: { role?: string; department?: string } | null | undefined): boolean {
  if (!session) return false;
  return session.role?.toLowerCase() === 'ceo' || isTechnicalStaff(session);
}

/** Where a user lands after signing in to AE-WS. */
export function workstationHome(session: { role?: string; department?: string }): string {
  if (session.role?.toLowerCase() === 'ceo') return '/ceo/dashboard';
  if (isTechnicalStaff(session)) return '/tech/dashboard';
  return canEditWebsite(session) ? '/cpanel/dashboard' : '/ceo/dashboard';
}
