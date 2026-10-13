import { requireWsPage } from '@/lib/workstation/ws-guard';
import Reports from '@/modules/ws/components/Reports';

export default async function Page() {
  await requireWsPage('reports');
  return <Reports />;
}
