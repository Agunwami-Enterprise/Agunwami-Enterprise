import { Suspense } from 'react';
import { TeamManager } from '@/app/components/cpanel/team';
import { listTeam } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelTeamPage() {
  const team = await listTeam();
  return (
    <Suspense>
      <TeamManager team={team} />
    </Suspense>
  );
}
