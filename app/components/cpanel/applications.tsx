'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import {
  Button, Card, ConfirmDelete, EmptyState, ErrorNote, IconButton, Modal, PageHeader, cpanelFetch, cx, useMutation,
} from './ui';
import {
  APPLICATION_STATUSES, type ApplicationStatus, type PartnershipApplication,
} from '@/backend/modules/site-content/site-content.types';
import { ApplicationStatusBadge, STATUS_STYLES, applicantName, statusLabel as label } from './application-format';

const DETAIL_SECTIONS: { title: string; fields: [keyof PartnershipApplication, string][] }[] = [
  { title: 'Contact', fields: [['email', 'Email'], ['phone', 'Phone'], ['linkedin', 'LinkedIn'], ['role', 'Role'], ['otherRole', 'Role (other)']] },
  { title: 'Organization', fields: [['orgName', 'Name'], ['orgType', 'Type'], ['industry', 'Industry'], ['orgSize', 'Size'], ['website', 'Website'], ['location', 'Location'], ['yearsInOperation', 'Years in operation']] },
  { title: 'Needs', fields: [['helpNeeded', 'Help needed'], ['otherHelpNeeded', 'Other help'], ['projectDescription', 'Project description'], ['challenges', 'Challenges'], ['otherChallenge', 'Other challenge'], ['desiredOutcome', 'Desired outcome'], ['currentSolutionType', 'Current solution']] },
  { title: 'Scope', fields: [['services', 'Services'], ['otherService', 'Other service'], ['additionalNotes', 'Notes'], ['budgetRange', 'Budget'], ['startTime', 'Start'], ['deadline', 'Deadline'], ['decisionMakers', 'Decision makers'], ['otherStakeholders', 'Other stakeholders']] },
];

function ApplicationDetail({ application, onClose }: { application: PartnershipApplication; onClose: () => void }) {
  const { busy, error, run } = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const del = useMutation();

  const setStatus = (status: ApplicationStatus) =>
    run(() => cpanelFetch(`/api/cpanel/applications/${application.id}`, { method: 'PATCH', json: { status } }));

  return (
    <>
      <Modal open title={applicantName(application)} onClose={onClose} width="max-w-[720px]"
        footer={(
          <>
            <Button variant="ghost" className="mr-auto text-red-600" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
            </Button>
            <Button variant="outline" onClick={onClose}>Close</Button>
          </>
        )}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-[#8A8A8A]">
            Submitted {new Date(application.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })} · Status:
          </span>
          {APPLICATION_STATUSES.map(status => (
            <button key={status} type="button" disabled={busy} onClick={() => setStatus(status)}
              className={cx('rounded-md px-2.5 py-1 text-[12px] font-semibold transition-colors',
                application.status === status ? STATUS_STYLES[status] + ' ring-1 ring-current' : 'bg-[#F3F1EA] text-[#6B6B6B] hover:bg-[#E9E5DA]')}>
              {label(status)}
            </button>
          ))}
        </div>
        <ErrorNote message={error} />
        {DETAIL_SECTIONS.map(section => {
          const rows = section.fields
            .map(([key, name]) => [name, application[key]] as const)
            .filter(([, value]) => (Array.isArray(value) ? value.length : value));
          if (!rows.length) return null;
          return (
            <section key={section.title}>
              <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#C89B3C]">{section.title}</h3>
              <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[160px_1fr]">
                {rows.map(([name, value]) => (
                  <div key={name} className="contents">
                    <dt className="text-[13px] text-[#8A8A8A]">{name}</dt>
                    <dd className="whitespace-pre-wrap text-[14px] text-[#1A1A1A]">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        })}
      </Modal>
      <ConfirmDelete open={confirmDelete} kind="Application" name={applicantName(application)}
        effect="The submission will be removed from the C-panel." busy={del.busy} error={del.error}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          if (await del.run(() => cpanelFetch(`/api/cpanel/applications/${application.id}`, { method: 'DELETE' }))) onClose();
        }} />
    </>
  );
}

export function ApplicationsManager({ applications }: { applications: PartnershipApplication[] }) {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<'all' | ApplicationStatus>('all');
  const [openId, setOpenId] = useState<string | null>(searchParams.get('open'));
  const counts = useMemo(() => {
    const result: Record<string, number> = { all: applications.length };
    for (const status of APPLICATION_STATUSES) result[status] = applications.filter(a => a.status === status).length;
    return result;
  }, [applications]);
  const visible = filter === 'all' ? applications : applications.filter(a => a.status === filter);
  const opened = applications.find(a => a.id === openId);

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Partnership Applications"
        subtitle={`${applications.length} total submission${applications.length === 1 ? '' : 's'}`} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {(['all', ...APPLICATION_STATUSES] as const).map(status => (
          <button key={status} type="button" role="tab" aria-selected={filter === status} onClick={() => setFilter(status)}
            className={cx('rounded-lg border px-4 py-2 text-[14px] font-semibold transition-colors',
              filter === status ? 'border-[#C89B3C] bg-[#C89B3C] text-white' : 'border-[#E5E2D9] bg-white text-[#5A5A5A] hover:bg-[#F7F5EF]')}>
            {status === 'all' ? 'All' : label(status)} <span className="ml-1 text-[12px] font-normal opacity-70">({counts[status]})</span>
          </button>
        ))}
      </div>
      <Card>
        {visible.length === 0 ? (
          <EmptyState>{applications.length ? 'No applications with this status.' : 'No applications yet.'}</EmptyState>
        ) : (
          <ul className="divide-y divide-[#F0EEE8]">
            {visible.map(application => (
              <li key={application.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#FBFAF6]">
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setOpenId(application.id)}>
                  <p className="truncate text-[15px] font-semibold text-[#1A1A1A]">{applicantName(application)}</p>
                  <p className="truncate text-[13px] text-[#8A8A8A]">
                    {[application.orgName, application.orgType, application.email].filter(Boolean).join(' · ')}
                  </p>
                </button>
                <span className="hidden text-[13px] text-[#8A8A8A] sm:block">
                  {new Date(application.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <ApplicationStatusBadge status={application.status} />
                <IconButton label="Open" onClick={() => setOpenId(application.id)}>
                  <span className="text-[13px] font-semibold text-[#C89B3C]">View</span>
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
      {opened && <ApplicationDetail application={opened} onClose={() => setOpenId(null)} />}
    </div>
  );
}
