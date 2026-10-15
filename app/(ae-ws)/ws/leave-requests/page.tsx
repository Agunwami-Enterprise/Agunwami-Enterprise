import { requireWsPage } from '@/lib/workstation/ws-guard';
import LeaveRequests from '@/modules/ws/components/LeaveRequests';

export default async function Page() {
  await requireWsPage('leave-requests');
  return <LeaveRequests />;
}
