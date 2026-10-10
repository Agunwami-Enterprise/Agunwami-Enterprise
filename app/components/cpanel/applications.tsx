'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Card, EmptyState, PageHeader, cx } from './ui';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type PartnershipApplication,
} from '@/backend/modules/site-content/site-content.types';
import {
  ApplicationStatusBadge,
  applicantName,
  statusLabel as label,
} from './application-format';

export function ApplicationsManager({
  applications,
}: {
  applications: PartnershipApplication[];
}) {
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: applications.length };
    for (const status of APPLICATION_STATUSES) {
      result[status] = applications.filter(a => a.status === status).length;
    }
    return result;
  }, [applications]);

  const visible =
    filter === 'all'
      ? applications
      : applications.filter(a => a.status === filter);

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader
        title="Partnership Applications"
        subtitle={`${applications.length} total submission${
          applications.length === 1 ? '' : 's'
        }`}
      />

      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {(['all', ...APPLICATION_STATUSES] as const).map(status => (
          <button
            key={status}
            type="button"
            role="tab"
            aria-selected={filter === status}
            onClick={() => setFilter(status)}
            className={cx(
              'rounded-lg border px-4 py-2 text-[14px] font-semibold transition-colors',
              filter === status
                ? 'border-[#C89B3C] bg-[#C89B3C] text-white'
                : 'border-[#E5E2D9] bg-white text-[#5A5A5A] hover:bg-[#F7F5EF]'
            )}
          >
            {status === 'all' ? 'All' : label(status)}{' '}
            <span className="ml-1 text-[12px] font-normal opacity-70">
              ({counts[status]})
            </span>
          </button>
        ))}
      </div>

      <Card>
        {visible.length === 0 ? (
          <EmptyState>
            {applications.length
              ? 'No applications with this status.'
              : 'No applications yet.'}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-[#F0EEE8]">
            {visible.map(application => (
              <li
                key={application.id}
                className="group transition-colors hover:bg-[#FBFAF6]"
              >
                <Link
                  href={`/cpanel/applications/${application.id}`}
                  className="flex items-center gap-4 px-5 py-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-[#1A1A1A] transition-colors group-hover:text-[#C89B3C]">
                      {applicantName(application)}
                    </p>
                    <p className="truncate text-[13px] text-[#8A8A8A]">
                      {[
                        application.orgName,
                        application.orgType,
                        application.email,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  <span className="hidden text-[13px] text-[#8A8A8A] sm:block">
                    {new Date(application.submittedAt).toLocaleDateString(
                      'en-US',
                      { month: 'short', day: 'numeric', year: 'numeric' }
                    )}
                  </span>

                  <ApplicationStatusBadge status={application.status} />

                  <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[13px] font-semibold text-[#C89B3C] transition-colors group-hover:bg-[#F3F1EA]">
                    View <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
