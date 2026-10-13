import { requireWsPage } from '@/lib/workstation/ws-guard';
import TechnicalStatus from '@/modules/ws/components/TechnicalStatus';

export default async function Page() {
  await requireWsPage('technical-status');
  return <TechnicalStatus />;
}
