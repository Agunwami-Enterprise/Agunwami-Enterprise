import { Suspense } from 'react';
import { ProjectsManager } from '@/app/components/cpanel/projects';
import { listProjects } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelProjectsPage() {
  const projects = await listProjects();
  return (
    <Suspense>
      <ProjectsManager projects={projects} />
    </Suspense>
  );
}
