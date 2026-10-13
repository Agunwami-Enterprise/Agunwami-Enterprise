import { requireWsPage } from '@/lib/workstation/ws-guard';
import ItSupport from '@/modules/ws/components/ItSupport';

export default async function Page() {
  await requireWsPage('it-support');
  return <ItSupport />;
}
