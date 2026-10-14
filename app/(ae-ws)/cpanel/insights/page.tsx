import { InsightsManager } from '@/app/components/cpanel/insights';
import { listArticlesFor } from '@/backend/modules/site-content';
import { verifySession } from '@/lib/workstation/session';
import { articleActor } from '@/lib/workstation/article-actor';

export const dynamic = 'force-dynamic';

export default async function CpanelInsightsPage() {
  const actor = await articleActor(await verifySession());
  return <InsightsManager articles={await listArticlesFor(actor)} isCeo={actor.isCeo} />;
}
