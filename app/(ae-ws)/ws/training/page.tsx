import { requireWsPage } from '@/lib/workstation/ws-guard';
import Training from '@/modules/ws/components/Training';

export default async function Page() {
  await requireWsPage('training');
  return <Training />;
}
