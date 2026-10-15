import type { Metadata } from 'next';
import CpanelShell from '@/app/components/cpanel/CpanelShell';
import { verifySession } from '@/lib/workstation/session';
import { redirect } from 'next/navigation';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { deniedHref } from '@/lib/workstation/access-denied';

export const metadata: Metadata = {
  title: 'C-Panel | Agunwami Enterprise',
  robots: { index: false, follow: false },
};

export default async function CpanelLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  const access = await getWorkstationAccess(session);
  // No C-panel: back to their own workstation, with a note.
  if (!access.canEditWebsite) redirect(deniedHref(access.home, 'cpanel'));

  // The way back to the person's own AE Workstation (CEO or their department's).
  const workstation = access.kind === 'ceo'
    ? { href: '/ceo/dashboard', label: 'CEO Workstation' }
    : access.kind === 'department'
      ? { href: '/ws/dashboard', label: `${access.departmentName ?? 'Department'} Workstation` }
      : null;
  const role = access.kind === 'ceo'
    ? 'CEO'
    : access.kind === 'department' ? `${access.title} · ${access.departmentName ?? 'Department'}` : 'Content Team';

  return (
    <CpanelShell email={session.email} role={role} workstation={workstation}>
      {children}
    </CpanelShell>
  );
}
