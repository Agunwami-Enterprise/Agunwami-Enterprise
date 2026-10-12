import SettingsPage from '@/modules/settings/components/SettingsPage';
import { requireWsPage } from '@/lib/workstation/ws-guard';

export default async function Page() {
  await requireWsPage('settings');
  return <SettingsPage />;
}
