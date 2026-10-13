import { requireWsPage } from '@/lib/workstation/ws-guard';
import TimeTracking from '@/modules/ws/components/TimeTracking';

export default async function Page() {
  await requireWsPage('time-tracking');
  return <TimeTracking />;
}
