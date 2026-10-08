import { Suspense } from 'react';
import { TeamManager } from '@/app/components/cpanel/team';
import { listMetricsPeople, listTeam } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelTeamPage() {
  const [team, metrics] = await Promise.all([
    listTeam(),
    // The team page still works if metrics can't be loaded; the picker says so.
    listMetricsPeople().catch(err => {
      console.error('[cpanel/team] Could not load people from project metrics:', err);
      return null;
    }),
  ]);
  return (
    <Suspense>
      <TeamManager team={team} metrics={metrics} />
    </Suspense>
  );
}
