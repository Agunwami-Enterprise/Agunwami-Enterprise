import MessagesPage from '@/modules/messages/components/MessagesPage';
import { requireWsPage } from '@/lib/workstation/ws-guard';

export default async function Page() {
  await requireWsPage('messages');
  return <MessagesPage />;
}
