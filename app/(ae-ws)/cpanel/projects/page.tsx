import { ProjectsManager } from '@/app/components/cpanel/projects';
import { listProjects } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelProjectsPage() {
  return <ProjectsManager projects={await listProjects()} />;
}
