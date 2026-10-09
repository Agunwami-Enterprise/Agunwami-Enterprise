import ProjectEditor from '@/app/components/cpanel/ProjectEditor';
import { requireCeoProjectAccess } from '../access';

export const dynamic = 'force-dynamic';

export default async function CeoNewProjectPage() {
  await requireCeoProjectAccess('/ceo/projects/new');
  return (
    <div className="px-5 py-8 md:px-16 md:py-10">
      <ProjectEditor basePath="/ceo/projects" editSuffix="/edit" backHref="/ceo/dashboard" backLabel="Dashboard" />
    </div>
  );
}
