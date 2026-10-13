/**
 * The access rules of lib/workstation/access.ts, without any data loading, so
 * they can be checked on their own.
 */

import type { AeDepartment, AeDepartmentMember } from '@/backend/modules/departments/departments.types';
import type { CeoAccess } from '@/backend/modules/departments/ceos.service';
import { BASE_PAGE_IDS, WORKSTATION_PAGES } from './pages';

export interface WorkstationAccess {
  /** pending: a project lists them as CEO and AE's official CEO hasn't approved them yet. */
  kind: 'ceo' | 'department' | 'suspended' | 'unassigned' | 'pending';
  departmentId: string | null;
  departmentName: string | null;
  title: string;
  pages: string[];
  departmentActive: boolean;
  isDepartmentAdmin: boolean;
  suspendedReason: string;
  /** Where this person lands after signing in. */
  home: string;
  canEditWebsite: boolean;
}

export interface SessionLike { uid: string; role?: string; department?: string }

export function computeAccess(
  session: SessionLike,
  membership: { member: AeDepartmentMember; department: AeDepartment } | null,
  legacyContent: boolean,
  ceo: CeoAccess,
): WorkstationAccess {
  if (ceo === 'ceo') {
    return {
      kind: 'ceo', departmentId: 'ceo', departmentName: 'CEO', title: 'CEO',
      pages: WORKSTATION_PAGES.map(page => page.id), departmentActive: true,
      isDepartmentAdmin: true, suspendedReason: '',
      home: '/ceo/dashboard', canEditWebsite: true,
    };
  }
  if (membership && membership.member.status === 'suspended') {
    const { department, member } = membership;
    return {
      kind: 'suspended', departmentId: department.id, departmentName: department.name,
      title: member.title || 'Team Member', pages: [], departmentActive: department.active,
      isDepartmentAdmin: false, suspendedReason: member.suspendedReason,
      home: '/ws/dashboard', canEditWebsite: false,
    };
  }
  if (membership) {
    const { department, member } = membership;
    const departmentPages = department.active ? department.pages : BASE_PAGE_IDS;
    // A personal page list narrows the department's pages; base pages stay open.
    const pages = member.pages.length > 0
      ? departmentPages.filter(id => BASE_PAGE_IDS.includes(id) || member.pages.includes(id))
      : departmentPages;
    return {
      kind: 'department', departmentId: department.id, departmentName: department.name,
      title: member.title || 'Team Member', pages, departmentActive: department.active,
      isDepartmentAdmin: member.isDepartmentAdmin, suspendedReason: '',
      home: '/ws/dashboard', canEditWebsite: pages.includes('website') || legacyContent,
    };
  }
  if (ceo === 'pending') {
    return {
      kind: 'pending', departmentId: null, departmentName: null, title: 'CEO', pages: [],
      departmentActive: false, isDepartmentAdmin: false, suspendedReason: '',
      home: '/ws/dashboard', canEditWebsite: false,
    };
  }
  return {
    kind: 'unassigned', departmentId: null, departmentName: null, title: 'Team Member',
    pages: [], departmentActive: false, isDepartmentAdmin: false, suspendedReason: '',
    home: legacyContent ? '/cpanel/dashboard' : '/ws/dashboard',
    canEditWebsite: legacyContent,
  };
}

export function canOpenPage(access: WorkstationAccess, pageId: string): boolean {
  return access.kind === 'ceo' || access.pages.includes(pageId);
}
