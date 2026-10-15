/**
 * GET /api/ceo/staff/external
 *
 * Staff in project departments that no AE department is linked to: people AE
 * changes don't reach. Read from each project's metrics (departments and
 * staff); grouped by project and project department. CEO only.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { DepartmentsService } from '@/backend/modules/departments';
import { ProjectsService, type ProjectStaffMember } from '@/backend/modules/projects';
import type { ExternalStaffMember, ExternalStaffProject } from '@/modules/staff/types';
import { departmentErrorResponse } from '../../departments/shared';

const key = (value: string | undefined) => (value ?? '').trim().toLowerCase();

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const [{ departments: aeDepartments, members }, projects] = await Promise.all([
      DepartmentsService.list(),
      ProjectsService.getProjectsOverview(),
    ]);

    const linked = new Set<string>();
    for (const department of aeDepartments) {
      for (const [projectId, projectDeptId] of Object.entries(department.projectLinks ?? {})) {
        if (projectDeptId) linked.add(`${projectId}:${key(projectDeptId)}`);
      }
    }
    const aeDepartmentName = new Map(aeDepartments.map(department => [department.id, department.name]));
    const memberDepartment = new Map(members.map(member => [member.uid, aeDepartmentName.get(member.departmentId) ?? null]));
    const withAe = (member: ProjectStaffMember): ExternalStaffMember => ({ ...member, aeDepartment: memberDepartment.get(member.id) ?? null });

    const result: ExternalStaffProject[] = projects.map(project => {
      const connected = Boolean(project.apiEndpoint) && project.hasApiToken !== false && project.status !== 'error';
      const projectDepartments = (project.departments ?? []).filter(department => key(department.id) !== 'ceo' && key(department.name) !== 'ceo');
      const isLinked = (id: string) => linked.has(`${project.id}:${key(id)}`);
      const staff = project.staff ?? [];
      const inDepartment = (department: { id: string; name: string }) => (member: ProjectStaffMember) =>
        [key(department.id), key(department.name)].includes(key(member.department));

      const groups = projectDepartments
        .filter(department => !isLinked(department.id))
        .map(department => ({
          id: department.id,
          name: department.name || department.id,
          staff: (department.staff ?? staff.filter(inDepartment(department))).map(withAe),
        }));

      // Staff whose department the project didn't list (or who have none).
      const listed = new Set(projectDepartments.flatMap(department => [key(department.id), key(department.name)]));
      const loose = staff.filter(member => key(member.department) !== 'ceo' && !listed.has(key(member.department)));
      if (loose.length) groups.push({ id: '', name: 'No department', staff: loose.map(withAe) });

      return {
        projectId: project.id,
        projectName: project.name,
        color: project.color || '#C89B3C',
        connected,
        linkedCount: projectDepartments.filter(department => isLinked(department.id)).length,
        departments: groups,
      };
    });

    return NextResponse.json({ projects: result });
  } catch (err) {
    return departmentErrorResponse(err, 'GET /api/ceo/staff/external');
  }
}
