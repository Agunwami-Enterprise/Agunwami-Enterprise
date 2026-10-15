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

/**
 * A department's two positions, as in AE Hub: "Technical Staff" (team member)
 * and "Technical Admin" (the department admin, one per department).
 */
export function positionTitle(departmentName: string, isAdmin: boolean): string {
  const name = departmentName.replace(/Team|Department/gi, '').trim() || 'Department';
  return `${name} ${isAdmin ? 'Admin' : 'Staff'}`;
}

/** What a department resource is: its guide, handbook, manual, policy or anything else. */
export const RESOURCE_KINDS = ['guide', 'handbook', 'manual', 'policy', 'other'] as const;
export type ResourceKind = (typeof RESOURCE_KINDS)[number];
export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  guide: 'Guide', handbook: 'Handbook', manual: 'Manual', policy: 'Policy', other: 'Other',
};

/**
 * A department's guide, handbook, manual and the like: a link, or a document
 * kept in Documents under the department's team (an uploaded file or one
 * written in the workstation, by id in AE Hub's documents).
 */
export interface DepartmentResource {
  id: string;
  kind: ResourceKind;
  title: string;
  type: 'link' | 'document';
  /** The link (type "link"). */
  url: string;
  /** The document's id in Documents (type "document"). */
  documentId: string;
  /** "written" opens in the document editor; "file" opens the uploaded file. */
  documentFormat: 'written' | 'file' | '';
  addedBy: string;
  addedAt: string;
}

export interface SaveResourceDto {
  kind: string;
  title: string;
  type: string;
  url?: string;
  documentId?: string;
  documentFormat?: string;
}

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
  /** Guides, handbooks, manuals and the like for the department's people. */
  resources: DepartmentResource[];
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
  /** Position: "<Department> Staff" or "<Department> Admin" (see positionTitle). */
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
  shiftStart?: string;
  shiftEnd?: string;
  pages?: string[];
  /** Position: the department admin (one per department) or staff. */
  isDepartmentAdmin?: boolean;
  status?: MemberStatus;
  suspendedReason?: string;
  /** Transfer to another department (they join as staff). */
  departmentId?: string;
}

export interface SaveDepartmentDto {
  name: string;
  description?: string;
  pages: string[];
  active: boolean;
  projectLinks?: Record<string, string>;
}

/** New members join as staff; make them the admin afterwards. */
export interface AssignMemberDto {
  uid: string;
  name: string;
  email: string;
}
