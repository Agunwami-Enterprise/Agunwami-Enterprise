import { requireWsPage } from '@/lib/workstation/ws-guard';
import Documents from '@/modules/ws/components/Documents';

export default async function Page() {
  await requireWsPage('documents');
  return <Documents />;
}
