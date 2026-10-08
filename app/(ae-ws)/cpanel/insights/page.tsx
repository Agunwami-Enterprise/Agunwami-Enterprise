import { InsightsManager } from '@/app/components/cpanel/insights';
import { listArticles } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelInsightsPage() {
  return <InsightsManager articles={await listArticles()} />;
}
