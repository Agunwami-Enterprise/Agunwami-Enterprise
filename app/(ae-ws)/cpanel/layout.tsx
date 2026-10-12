import type { Metadata } from 'next';
import Link from 'next/link';
import CpanelShell from '@/app/components/cpanel/CpanelShell';
import { verifySession } from '@/lib/workstation/session';
import { getWorkstationAccess } from '@/lib/workstation/access';

export const metadata: Metadata = {
  title: 'C-Panel | Agunwami Enterprise',
  robots: { index: false, follow: false },
};

export default async function CpanelLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();

  if (!(await getWorkstationAccess(session)).canEditWebsite) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#FBFAF3] p-6 text-center">
        <h1 className="font-primary text-[28px] text-[#1A1A1A]">No access to the C-panel</h1>
        <p className="max-w-md text-[15px] text-[#6B6B6B]">
          The website control panel is for the CEO and departments the CEO has given the Website C-Panel
          page on the Departments page.
        </p>
        <Link href="/auth/login" className="rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-[14px] font-semibold text-white">
          Back to sign in
        </Link>
      </main>
    );
  }

  return (
    <CpanelShell email={session.email} isCeo={session.role.toLowerCase() === 'ceo'}>
      {children}
    </CpanelShell>
  );
}
