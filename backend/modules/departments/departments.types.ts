/**
 * backend/modules/departments/departments.types.ts
 *
 * AE departments: created by the CEO in the AE Workstation, each with the
 * workstation pages its members can open. Stored in the enterprise project.
 */

export interface AeDepartment {
  id: string;
  name: string;
  description: string;
  /** Workstation page ids (lib/workstation/pages.ts), base pages included. */
  pages: string[];
  /** Inactive departments keep only the base pages. */
  active: boolean;
  memberCount: number;
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
}

export interface AssignMemberDto {
  uid: string;
  name: string;
  email: string;
  title?: string;
}
