import Link from 'next/link';
import { notFound } from 'next/navigation';

// Technical workstation pages from the Figma design that are built in later
// steps. Each one says what it will hold, so the sidebar never leads nowhere.
const UPCOMING: Record<string, { title: string; summary: string }> = {
  tasks: { title: 'Tasks', summary: 'Your tasks and the team’s, sprint boards, and task assignment.' },
  'time-tracking': { title: 'Time Tracking', summary: 'Your clock-in history, monthly attendance and hours worked.' },
  documents: { title: 'Documents', summary: 'Technical documents and files shared with the team.' },
  'leave-requests': { title: 'Leave Request', summary: 'Request leave and follow your requests.' },
  reports: { title: 'Reports', summary: 'Team delivery, task and support reports.' },
  payments: { title: 'My Payment', summary: 'Your salary and payment history.' },
  notifications: { title: 'Notifications', summary: 'Announcements and updates for the Technical team.' },
  development: { title: 'Development', summary: 'Code reviews, pull requests and deployments across the projects.' },
  'technical-status': { title: 'Technical Status', summary: 'Website status, hosting alerts, integration errors and incidents.' },
  'it-support': { title: 'IT Support', summary: 'Support tickets from other departments, with priorities and service levels.' },
  'workstation-builder': { title: 'Workstation Builder', summary: 'Configure workstations for other departments.' },
  staff: { title: 'Staff Management', summary: 'The Technical team’s members, roles and availability.' },
  training: { title: 'Training', summary: 'Courses and learning progress for the team.' },
};

export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = UPCOMING[section];
  if (!page) notFound();

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-xl rounded-lg bg-[#fafafa] p-8 text-center shadow-[0px_4px_5px_rgba(0,0,0,0.15)] dark:bg-[#1e1e1e]">
        <span className="inline-block rounded-md bg-[#fef3c7] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">
          Coming next
        </span>
        <h1 className="mt-3 text-[24px] font-semibold leading-8 text-[#292929] dark:text-white">{page.title}</h1>
        <p className="mt-2 text-[16px] leading-6 text-[#656565] dark:text-gray-400">{page.summary}</p>
        <Link
          href="/tech/dashboard"
          className="mt-6 inline-block rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
