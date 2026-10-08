import { notFound } from 'next/navigation';
import ProjectEditor from '@/app/components/cpanel/ProjectEditor';
import { getProjectBySlug } from '@/backend/modules/site-content';
import { requireCeoProjectAccess } from '../../access';

export const dynamic = 'force-dynamic';

export default async function CeoEditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCeoProjectAccess(`/ceo/projects/${encodeURIComponent(id)}/edit`);
  const project = await getProjectBySlug(decodeURIComponent(id));
  if (!project) notFound();
  return (
    <div className="px-5 py-8 md:px-16 md:py-10">
      {/* Keyed so creating a project (which navigates here) starts a fresh editor. */}
      <ProjectEditor key={project.id} project={project} basePath="/ceo/projects" editSuffix="/edit"
        backHref={`/ceo/projects/${encodeURIComponent(project.id)}`} backLabel={project.name} />
    </div>
  );
}
