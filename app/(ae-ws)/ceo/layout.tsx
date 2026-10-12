import { redirect } from 'next/navigation';
import CeoShell from '@/app/components/ceo/CeoShell';
import { verifySession } from '@/lib/workstation/session';
import { getWorkstationAccess } from '@/lib/workstation/access';

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect('/auth/login');
  // /ceo is the CEO's workstation; everyone else has their department's (/ws).
  if (session.role?.toLowerCase() !== 'ceo') redirect((await getWorkstationAccess(session)).home);
  return <CeoShell>{children}</CeoShell>;
}
