/**
 * Legacy C-panel access from AE Hub departments. The C-panel is now a page
 * the CEO gives to an AE department (Departments page, "Website C-Panel");
 * until the content team is put in such a department, staff in these AE Hub
 * departments keep their access. See lib/workstation/access.ts.
 */

export const CONTENT_DEPARTMENTS = ['content-admin', 'content-staff'];

export function isLegacyContentStaff(session: { role?: string; department?: string } | null | undefined): boolean {
  return CONTENT_DEPARTMENTS.includes(session?.department?.toLowerCase() ?? '');
}
