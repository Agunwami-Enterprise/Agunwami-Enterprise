import { requireWsPage } from '@/lib/workstation/ws-guard';
import Tasks from '@/modules/ws/components/Tasks';

export default async function Page() {
  await requireWsPage('tasks');
  return <Tasks />;
}
