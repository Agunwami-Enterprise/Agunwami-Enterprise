import 'server-only';
import { DepartmentsService } from '@/backend/modules/departments';
import { ProjectsService, type ProjectDepartmentOptions } from '@/backend/modules/projects';

/** Links CEO Office to each project's CEO department, once (see DepartmentsService.autoLinkCeoOffice). */
export async function autoLinkCeoOffice(options?: ProjectDepartmentOptions[]): Promise<void> {
  try {
    const projects = options ?? await ProjectsService.getProjectDepartmentOptions();
    const links: Record<string, string> = {};
    for (const project of projects) {
      const ceo = project.departments.find(department => department.ceo);
      if (ceo) links[project.projectId] = ceo.id;
    }
    await DepartmentsService.autoLinkCeoOffice(links);
  } catch (err) {
    console.error('[departments] Linking CEO Office failed:', err);
  }
}
