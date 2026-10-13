import { requireWsPage } from '@/lib/workstation/ws-guard';
import StaffManagement from '@/modules/ws/components/StaffManagement';

export default async function Page() {
  await requireWsPage('staff');
  return <StaffManagement />;
}
