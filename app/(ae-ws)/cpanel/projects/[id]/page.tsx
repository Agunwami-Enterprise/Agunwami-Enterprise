import { notFound } from 'next/navigation';
import ProjectEditor from '@/app/components/cpanel/ProjectEditor';
import { getProjectBySlug } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProjectBySlug(id);
  if (!project) notFound();
  // Keyed so creating a project (which navigates here) starts a fresh editor.
  return <ProjectEditor key={project.id} project={project} />;
}
