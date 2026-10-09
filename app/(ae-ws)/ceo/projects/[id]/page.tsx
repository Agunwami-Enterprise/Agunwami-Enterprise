import { notFound } from 'next/navigation';
import ProjectDetails from '@/app/components/ceo/project-details/ProjectDetails';
import { ProjectsService } from '@/backend/modules/projects';
import { getProjectBySlug } from '@/backend/modules/site-content';
import { requireCeoProjectAccess } from '../access';

export const dynamic = 'force-dynamic';

export default async function CeoProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ refresh?: string }>;
}) {
  const [{ id: rawId }, { refresh }] = await Promise.all([params, searchParams]);
  const id = decodeURIComponent(rawId);
  await requireCeoProjectAccess(`/ceo/projects/${encodeURIComponent(id)}`);

  // Live numbers from the project's metrics endpoint (cached for a minute unless refreshed).
  const projects = await ProjectsService.getProjectsOverview(Boolean(refresh));
  const project = projects.find(p => p.id === id);
  if (!project) notFound();

  // Website details (category, icon, live URL) live on the same workstation record.
  const site = await getProjectBySlug(id);
  return (
    <div className="px-5 py-8 md:px-8">
      <ProjectDetails project={project} category={site?.category ?? ''} icon={site?.icon ?? null} websiteUrl={site?.websiteUrl ?? ''} />
    </div>
  );
}
