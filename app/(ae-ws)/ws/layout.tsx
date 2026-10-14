import type { Metadata } from 'next';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import WorkstationShell from '@/app/components/ws/WorkstationShell';
import { verifySession } from '@/lib/workstation/session';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { deniedHref } from '@/lib/workstation/access-denied';

export const metadata: Metadata = {
  title: 'Workstation | Agunwami Enterprise',
  robots: { index: false, follow: false },
};

function Holding({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#faf8ec] p-6 text-center dark:bg-[#111111]">
      <h1 className="text-[24px] font-semibold text-[#1a1a1a] dark:text-white">{title}</h1>
      <div className="max-w-md text-[15px] text-[#656565] dark:text-gray-400">{children}</div>
      <Link href="/auth/login" className="rounded-lg bg-[#1f1f1f] px-4 py-2.5 text-[14px] font-semibold text-white">
        Back to sign in
      </Link>
    </main>
  );
}

export default async function WorkstationLayout({ children }: { children: React.ReactNode }) {
  const session = await verifySession();
  const access = await getWorkstationAccess(session);

  // The CEO isn't part of a department workstation: a document opens in the CEO Workstation
  // instead; anything else goes back there with a note.
  if (access.kind === 'ceo') {
    const asked = (await headers()).get('x-ae-path') ?? '';
    const document = /^\/ws\/documents\/([\w-]+)\/?(\?.*)?$/.exec(asked);
    redirect(document ? `/ceo/documents/${document[1]}${document[2] ?? ''}` : deniedHref(access.home, 'ws'));
  }

  if (access.kind === 'unassigned') {
    return (
      <Holding title="You're not in a department yet">
        <p>
          Your account works, but the CEO hasn&apos;t added you to an AE department, so there&apos;s no workstation to show
          yet. Ask the CEO to add you on the Departments page, then reload this page.
        </p>
      </Holding>
    );
  }
  if (access.kind === 'pending') {
    return (
      <Holding title="Waiting for the CEO's approval">
        <p>
          A project lists you as a CEO. CEO access to the AE Workstation is given by the official CEO; they&apos;ll see
          you on the Staff Management page. Reload this page once they&apos;ve approved you or added you to a department.
        </p>
      </Holding>
    );
  }
  if (access.kind === 'suspended') {
    return (
      <Holding title="Your workstation access is suspended">
        <p>{access.suspendedReason || 'Your access to the AE Workstation has been suspended.'} Contact the CEO if you think this is a mistake.</p>
      </Holding>
    );
  }

  return (
    <WorkstationShell
      access={{
        kind: access.kind,
        departmentId: access.departmentId ?? '',
        departmentName: access.departmentName ?? 'Department',
        title: access.title,
        pages: access.pages,
        isDepartmentAdmin: access.isDepartmentAdmin,
      }}
    >
      {children}
    </WorkstationShell>
  );
}
