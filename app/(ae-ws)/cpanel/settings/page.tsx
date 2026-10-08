import { SettingsForm } from '@/app/components/cpanel/settings';
import { getSettings } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelSettingsPage() {
  return <SettingsForm settings={await getSettings()} />;
}
