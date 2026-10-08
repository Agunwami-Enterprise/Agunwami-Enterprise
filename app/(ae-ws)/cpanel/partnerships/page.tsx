import { PartnershipsManager } from '@/app/components/cpanel/partnerships';
import { listPartnershipCategories } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

export default async function CpanelPartnershipsPage() {
  return <PartnershipsManager categories={await listPartnershipCategories()} />;
}
