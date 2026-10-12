import { redirect } from 'next/navigation';
import CeoShell from '@/app/components/ceo/CeoShell';
import { verifySession } from '@/lib/workstation/session';
import { isTechnicalStaff } from '@/lib/workstation/content-access';

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (!session) redirect('/auth/login');
  // The Technical team has its own workstation.
  if (session.role?.toLowerCase() !== 'ceo' && isTechnicalStaff(session)) redirect('/tech/dashboard');
  return <CeoShell>{children}</CeoShell>;
}
