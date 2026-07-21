import { redirect } from 'next/navigation';
import CeoShell from '@/components/CeoShell';
import { verifySession } from '@/lib/session';

export default async function CeoLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  if (session.role !== 'ceo') redirect('/login');
  return <CeoShell>{children}</CeoShell>;
}
