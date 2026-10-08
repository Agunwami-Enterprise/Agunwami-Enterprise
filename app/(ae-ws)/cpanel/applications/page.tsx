import { Suspense } from 'react';
import { ApplicationsManager } from '@/app/components/cpanel/applications';
import { listApplications } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelApplicationsPage() {
  const applications = await listApplications();
  return (
    <Suspense>
      <ApplicationsManager applications={applications} />
    </Suspense>
  );
}
