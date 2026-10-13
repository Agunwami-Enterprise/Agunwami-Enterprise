/**
 * Applies AE staff changes in the projects an AE department is linked to
 * (Departments page → "Linked project departments"), e.g. AE "Technical" ↔
 * AE Hub "developers". AE is the parent, so its change always stands; each
 * project's result is reported back so a failure can be retried there.
 *
 * - Added to / transferred into a department → transfer to its linked
 *   project department (with their position), in the projects the CEO chose.
 *   A project department change can give them a new project staff id and
 *   work email (in AE Hub, also their sign-in email); the project reports
 *   them back.
 * - Made department admin / staff → position (admin true / false).
 * - Suspended / reactivated → suspend / reactivate.
 * - Removed from the department → removed from the linked project department.
 */

import 'server-only';
import { listProjectRecords, ProjectsService, type ProjectStaffAction } from '@/backend/modules/projects';
import type { AeDepartment, AeDepartmentMember } from '@/backend/modules/departments';

export interface ProjectSyncResult {
  projectId: string;
  projectName: string;
  action: ProjectStaffAction['action'];
  ok: boolean;
  /** The project had nothing to change, e.g. no staff record for this person. */
  skipped?: string;
  error?: string;
  /** Their email and project staff id after the change, when the project reports them. */
  email?: string;
  staffId?: string;
}

async function send(
  department: AeDepartment | null,
  build: (projectDepartment: string) => Omit<ProjectStaffAction, 'uid' | 'email'>,
  member: Pick<AeDepartmentMember, 'uid' | 'email'>,
  onlyProjects?: string[],
): Promise<ProjectSyncResult[]> {
  const links = Object.entries(department?.projectLinks ?? {})
    .filter(([projectId]) => !onlyProjects || onlyProjects.includes(projectId));
  if (links.length === 0) return [];
  const names = new Map((await listProjectRecords()).map(project => [project.id, project.name]));
  return Promise.all(links.map(async ([projectId, projectDepartment]) => {
    const payload: ProjectStaffAction = { ...build(projectDepartment), uid: member.uid, ...(member.email ? { email: member.email } : {}) };
    const base = { projectId, projectName: names.get(projectId) ?? projectId, action: payload.action };
    if (!names.has(projectId)) return { ...base, ok: false, error: 'That project no longer exists.' };
    try {
      const { skipped, email, staffId } = await ProjectsService.sendStaffAction(projectId, payload);
      return { ...base, ok: true, ...(skipped ? { skipped } : {}), ...(email ? { email } : {}), ...(staffId ? { staffId } : {}) };
    } catch (err) {
      return { ...base, ok: false, error: err instanceof Error ? err.message : 'The project could not be updated.' };
    }
  }));
}

/**
 * Someone was added to (or moved into) a department. `onlyProjects`: the
 * linked projects to move them in too (all of them when left out).
 */
export function syncAdded(member: AeDepartmentMember, department: AeDepartment | null, onlyProjects?: string[]): Promise<ProjectSyncResult[]> {
  return send(department, projectDepartment => ({
    action: 'transfer', department: projectDepartment, admin: false,
  }), member, onlyProjects);
}

/** A member's record changed: transfer, position or suspension. */
export async function syncUpdated(
  before: AeDepartmentMember,
  after: AeDepartmentMember,
  departmentAfter: AeDepartment | null,
  transferProjects?: string[],
): Promise<ProjectSyncResult[]> {
  const results: ProjectSyncResult[] = [];
  if (after.departmentId !== before.departmentId) {
    results.push(...await syncAdded(after, departmentAfter, transferProjects));
  } else if (after.isDepartmentAdmin !== before.isDepartmentAdmin) {
    results.push(...await send(departmentAfter, projectDepartment => ({
      action: 'position', department: projectDepartment, admin: after.isDepartmentAdmin, position: after.title,
    }), after));
  }
  if (after.status !== before.status) {
    results.push(...await send(departmentAfter, () => (after.status === 'suspended'
      ? { action: 'suspend', reason: after.suspendedReason || undefined }
      : { action: 'reactivate' }), after));
  }
  return results;
}

/** Someone was removed from a department. */
export function syncRemoved(member: AeDepartmentMember, department: AeDepartment | null): Promise<ProjectSyncResult[]> {
  return send(department, projectDepartment => ({ action: 'remove', department: projectDepartment }), member);
}

/** The email a project reported after a change, if it differs from AE's copy (e.g. a new AE Hub work email). */
export function reportedEmail(member: Pick<AeDepartmentMember, 'email'>, sync: ProjectSyncResult[]): string | null {
  const email = sync.find(result => result.ok && result.email)?.email ?? null;
  return email && email !== member.email.toLowerCase() ? email : null;
}
