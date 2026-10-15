import { requireWsPage } from '@/lib/workstation/ws-guard';
import Development from '@/modules/ws/components/Development';

export default async function Page() {
  await requireWsPage('development');
  return <Development />;
}
