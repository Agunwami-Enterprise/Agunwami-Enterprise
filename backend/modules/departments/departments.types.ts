/**
 * backend/modules/departments/departments.types.ts
 *
 * AE departments: created by the CEO in the AE Workstation, each with the
 * workstation pages its members can open. Stored in the enterprise project.
 */

/** The built-in department for the CEO's own staff (assistants, PAs, chief of staff). */
export const CEO_OFFICE_ID = 'ceo-office';
export const CEO_OFFICE_NAME = 'CEO Office';
/** A project's CEO department; only CEO Office links to it. */
export const PROJECT_CEO_DEPARTMENT = 'ceo';

export interface AeDepartment {
  id: string;
  name: string;
  description: string;
  /** Workstation page ids (lib/workstation/pages.ts), base pages included. */
  pages: string[];
  /** Inactive departments keep only the base pages. */
  active: boolean;
  /**
   * The department this one maps to in each project, by project id, e.g.
   * { "ae-hub": "developers" }. Staff changes here are applied there too.
   */
  projectLinks: Record<string, string>;
  memberCount: number;
  /** CEO Office: built in, can't be deleted or renamed. */
  builtIn: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

export type MemberStatus = 'active' | 'suspended';

export interface AeDepartmentMember {
  uid: string;
  departmentId: string;
  name: string;
  email: string;
  /** Position, e.g. "Lead Developer". */
  title: string;
  /** Work shift, "HH:mm". */
  shiftStart: string;
  shiftEnd: string;
  /** Pages this person may open, within their department's pages; empty = all of them. */
  pages: string[];
  isDepartmentAdmin: boolean;
  status: MemberStatus;
  suspendedReason: string;
  updatedAt: string | null;
}

export interface UpdateMemberDto {
  title?: string;
  shiftStart?: string;
  shiftEnd?: string;
  pages?: string[];
  isDepartmentAdmin?: boolean;
  status?: MemberStatus;
  suspendedReason?: string;
  /** Transfer to another department. */
  departmentId?: string;
}

export interface SaveDepartmentDto {
  name: string;
  description?: string;
  pages: string[];
  active: boolean;
  projectLinks?: Record<string, string>;
}

export interface AssignMemberDto {
  uid: string;
  name: string;
  email: string;
  title?: string;
}
