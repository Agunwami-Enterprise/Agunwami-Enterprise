import Link from 'next/link';
import { ArrowRight, BookOpen, FileText, FolderOpen, Users } from 'lucide-react';
import { Card, EmptyState, PageHeader } from '@/app/components/cpanel/ui';
import { ApplicationStatusBadge, applicantName } from '@/app/components/cpanel/application-format';
import { listApplications, listArticles, listProjects, listTeam } from '@/backend/modules/site-content';

export const dynamic = 'force-dynamic';

const QUICK_ACTIONS = [
  { label: 'Add New Project', href: '/cpanel/projects?new=1' },
  { label: 'Add Team Member', href: '/cpanel/team?new=1' },
  { label: 'Write New Article', href: '/cpanel/insights/new' },
  { label: 'Update Site Settings', href: '/cpanel/settings' },
];

export default async function CpanelDashboard() {
  const [projects, team, articles, applications] = await Promise.all([
    listProjects(), listTeam(), listArticles(), listApplications(),
  ]);
  const stats = [
    { label: 'Projects', value: projects.length, href: '/cpanel/projects', icon: FolderOpen, tint: 'bg-blue-50 text-blue-600' },
    { label: 'Team Members', value: team.length, href: '/cpanel/team', icon: Users, tint: 'bg-purple-50 text-purple-600' },
    { label: 'Articles', value: articles.length, href: '/cpanel/insights', icon: BookOpen, tint: 'bg-green-50 text-green-600' },
    { label: 'Applications', value: applications.length, href: '/cpanel/applications', icon: FileText, tint: 'bg-amber-50 text-amber-600' },
  ];

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Dashboard" subtitle="Welcome back — here's an overview of your website." />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, href, icon: Icon, tint }) => (
          <Link key={label} href={href} className="group">
            <Card className="p-5 transition-shadow group-hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${tint}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <ArrowRight className="h-4 w-4 text-[#B5B5B5] transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </div>
              <p className="mt-4 text-[32px] font-bold leading-none text-[#1A1A1A]">{value}</p>
              <p className="mt-2 text-[14px] text-[#6B6B6B]">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <Card>
          <div className="flex items-center justify-between border-b border-[#F0EEE8] px-5 py-4">
            <h2 className="text-[15px] font-semibold text-[#1A1A1A]">Recent Applications</h2>
            <Link href="/cpanel/applications" className="text-[13px] font-semibold text-[#C89B3C] hover:underline">View all</Link>
          </div>
          {applications.length === 0 ? (
            <EmptyState>No applications yet. They will appear here when submitted.</EmptyState>
          ) : (
            <ul className="divide-y divide-[#F0EEE8]">
              {applications.slice(0, 5).map(application => (
                <li key={application.id}>
                  <Link href={`/cpanel/applications?open=${application.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-[#FBFAF6]">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-[#1A1A1A]">{applicantName(application)}</p>
                      <p className="truncate text-[13px] text-[#8A8A8A]">
                        {application.orgName || application.email} · {new Date(application.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="self-start">
          <h2 className="border-b border-[#F0EEE8] px-5 py-4 text-[15px] font-semibold text-[#1A1A1A]">Quick Actions</h2>
          <ul className="p-2">
            {[...QUICK_ACTIONS, { label: 'View Live Website', href: '/' }].map(action => (
              <li key={action.label}>
                <Link href={action.href} target={action.href === '/' ? '_blank' : undefined}
                  className="flex items-center justify-between rounded-lg px-3 py-2.5 text-[14px] text-[#3A3A3A] hover:bg-[#F7F5EF]">
                  {action.label} <ArrowRight className="h-4 w-4 text-[#B5B5B5]" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
