import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ApplicationsManager } from '@/app/components/cpanel/applications';
import { listApplications } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelApplicationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ open?: string }>;
}) {
  const params = await searchParams;
  if (params?.open) {
    redirect(`/cpanel/applications/${params.open}`);
  }

  const applications = await listApplications();
  return (
    <Suspense>
      <ApplicationsManager applications={applications} />
    </Suspense>
  );
}
