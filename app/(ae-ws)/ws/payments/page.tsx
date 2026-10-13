import { requireWsPage } from '@/lib/workstation/ws-guard';
import MyPayments from '@/modules/ws/components/MyPayments';

export default async function Page() {
  await requireWsPage('payments');
  return <MyPayments />;
}
