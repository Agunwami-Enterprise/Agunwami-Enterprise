import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pageForSection } from '@/lib/workstation/pages';
import { requireWsPage } from '@/lib/workstation/ws-guard';

// Workstation pages from the design that are built in later steps. Each one
// says what it will hold, so the sidebar never leads nowhere. Opening one
// still needs the department to have the page.
export default async function Page({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = pageForSection(section);
  if (!page) notFound();
  await requireWsPage(page.id);

  return (
    <div className="p-4 md:p-8">
      <div className="mx-auto max-w-xl rounded-lg bg-[#fafafa] p-8 text-center shadow-[0px_4px_5px_rgba(0,0,0,0.15)] dark:bg-[#1e1e1e]">
        <span className="inline-block rounded-md bg-[#fef3c7] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">
          Coming next
        </span>
        <h1 className="mt-3 text-[24px] font-semibold leading-8 text-[#292929] dark:text-white">{page.label}</h1>
        <p className="mt-2 text-[16px] leading-6 text-[#656565] dark:text-gray-400">{page.description}.</p>
        <Link
          href="/ws/dashboard"
          className="mt-6 inline-block rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90"
        >
          Back to Overview
        </Link>
      </div>
    </div>
  );
}
