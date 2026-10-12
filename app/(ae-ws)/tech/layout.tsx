import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import TechShell from '@/app/components/tech/TechShell';
import { verifySession } from '@/lib/workstation/session';
import { canUseTechWorkstation, workstationHome } from '@/lib/workstation/content-access';

export const metadata: Metadata = {
  title: 'Technical Workstation | Agunwami Enterprise',
  robots: { index: false, follow: false },
};

export default async function TechLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  // The Technical team and the CEO; anyone else goes to their own workstation.
  if (!canUseTechWorkstation(session)) redirect(workstationHome(session));
  return <TechShell>{children}</TechShell>;
}
