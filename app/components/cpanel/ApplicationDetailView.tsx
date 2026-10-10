'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { BsLinkedin } from 'react-icons/bs';
import {
  Button,
  Card,
  ConfirmDelete,
  ErrorNote,
  cpanelFetch,
  cx,
  useMutation,
} from './ui';
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type PartnershipApplication,
} from '@/backend/modules/site-content/site-content.types';
import {
  STATUS_STYLES,
  applicantName,
  statusLabel,
} from './application-format';

function CopyAction({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard write may fail in non-secure contexts
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium text-[#8A8A8A] transition-colors hover:bg-[#F3F1EA] hover:text-[#1A1A1A]"
    >
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-600" aria-hidden="true" />
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" aria-hidden="true" />
          <span>Copy</span>
        </>
      )}
    </button>
  );
}

function SpamBadge() {
  return (
    <span
      className="rounded-md bg-[#FEF3C7] px-2 py-0.5 text-[12px] font-semibold text-[#92400E]"
      title="The form's hidden spam-trap field was filled"
    >
      Possible spam
    </span>
  );
}

function SpamNote() {
  return (
    <div className="rounded-xl border border-[#FDE68A] bg-[#FEF3C7] p-4 text-[13px] leading-relaxed text-[#92400E]">
      <strong className="font-semibold">Possible spam notice:</strong> The form&apos;s hidden spam-trap field was filled. Browsers and password managers sometimes fill it for real people, so verify the details before deleting.
    </div>
  );
}

function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5 border-b border-[#F0EEE8] pb-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FAF8F2] text-[#C89B3C]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-[#1A1A1A]">{title}</h2>
        {subtitle && <p className="text-[12px] text-[#8A8A8A]">{subtitle}</p>}
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  action,
}: {
  label: string;
  value?: React.ReactNode;
  action?: React.ReactNode;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-3 py-2 text-[14px]">
      <span className="shrink-0 text-[13px] font-medium text-[#8A8A8A]">{label}</span>
      <div className="flex items-center gap-2 text-right">
        <span className="text-[#1A1A1A]">{value}</span>
        {action}
      </div>
    </div>
  );
}

function PillTag({
  children,
  highlight = false,
}: {
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors',
        highlight
          ? 'border border-[#C89B3C]/30 bg-[#C89B3C]/10 text-[#8B6B22]'
          : 'border border-[#ECEAE3] bg-[#FBFAF6] text-[#3A3A3A]'
      )}
    >
      {children}
    </span>
  );
}

export function ApplicationDetailView({
  initialApplication,
}: {
  initialApplication: PartnershipApplication;
}) {
  const router = useRouter();
  const [application, setApplication] = useState<PartnershipApplication>(initialApplication);
  const { busy, error, run } = useMutation();
  const del = useMutation();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fullName = applicantName(application);
  const initials =
    `${application.firstName?.[0] || ''}${application.lastName?.[0] || ''}`.trim().toUpperCase() ||
    application.email[0]?.toUpperCase() ||
    'A';

  const setStatus = async (status: ApplicationStatus) => {
    if (status === application.status || busy) return;
    const ok = await run(() =>
      cpanelFetch(`/api/cpanel/applications/${application.id}`, {
        method: 'PATCH',
        json: { status },
      })
    );
    if (ok) {
      setApplication(prev => ({ ...prev, status }));
    }
  };

  const handleDelete = async () => {
    const ok = await del.run(() =>
      cpanelFetch(`/api/cpanel/applications/${application.id}`, { method: 'DELETE' })
    );
    if (ok) {
      router.push('/cpanel/applications');
    }
  };

  const formattedDate = new Date(application.submittedAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(application.submittedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-[1120px] pb-16 font-secondary">
      {/* Top breadcrumb & global action bar */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/cpanel/applications"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#E5E2D9] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#5A5A5A] transition-colors hover:bg-[#F7F5EF] hover:text-[#1A1A1A]"
          >
            <ArrowLeft className="h-4 w-4" /> Back to applications
          </Link>
          <span className="text-[#C89B3C]">/</span>
          <span className="truncate text-[13px] font-medium text-[#8A8A8A]">
            {fullName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {application.email && (
            <a
              href={`mailto:${application.email}`}
              className="inline-flex items-center gap-2 rounded-lg border border-[#E5E2D9] bg-white px-3 py-1.5 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:bg-[#F7F5EF]"
            >
              <Mail className="h-4 w-4 text-[#C89B3C]" /> Email applicant
            </a>
          )}
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" /> Delete
          </Button>
        </div>
      </div>

      {/* Spam alert if flagged */}
      {application.flaggedAsSpam && (
        <div className="mb-6">
          <SpamNote />
        </div>
      )}

      {/* Main hero header card */}
      <Card className="mb-6 overflow-hidden p-6 md:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#996515] text-xl font-bold text-white shadow-md">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-primary text-[24px] font-semibold tracking-tight text-[#1A1A1A] sm:text-[28px]">
                  {fullName}
                </h1>
                <span
                  className={cx(
                    'rounded-md px-2.5 py-0.5 text-[12px] font-semibold',
                    STATUS_STYLES[application.status]
                  )}
                >
                  {statusLabel(application.status)}
                </span>
                {application.flaggedAsSpam && <SpamBadge />}
              </div>
              <p className="mt-1 text-[14px] text-[#6B6B6B]">
                {[
                  application.role,
                  application.otherRole,
                  application.orgName,
                  application.location,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-[12px] text-[#8A8A8A]">
                <Clock className="h-3.5 w-3.5" /> Submitted on {formattedDate} at {formattedTime}
              </p>
            </div>
          </div>

          {/* Quick status selector */}
          <div className="flex flex-col gap-2 rounded-xl border border-[#ECEAE3] bg-[#FBFAF6] p-3 sm:items-end">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
              Application Status
            </span>
            <div className="flex flex-wrap gap-1.5">
              {APPLICATION_STATUSES.map(st => {
                const isActive = application.status === st;
                return (
                  <button
                    key={st}
                    type="button"
                    disabled={busy}
                    onClick={() => setStatus(st)}
                    className={cx(
                      'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-semibold transition-all',
                      isActive
                        ? cx(STATUS_STYLES[st], 'ring-2 ring-current shadow-sm')
                        : 'bg-white text-[#6B6B6B] border border-[#E5E2D9] hover:bg-[#F3F1EA] hover:text-[#1A1A1A]'
                    )}
                  >
                    {isActive && <Check className="h-3 w-3" />}
                    {statusLabel(st)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <ErrorNote message={error} />
      </Card>

      {/* Grid: 2 cols main, 1 col sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Project Needs & Scope */}
          <Card className="p-6 md:p-7">
            <SectionHeading
              icon={Target}
              title="Project Needs & Objectives"
              subtitle="What the applicant is seeking from the partnership"
            />

            {/* Help needed */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                Help Needed
              </h3>
              {application.helpNeeded && application.helpNeeded.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {application.helpNeeded.map((item, idx) => (
                    <PillTag key={idx} highlight>{item}</PillTag>
                  ))}
                  {application.otherHelpNeeded && (
                    <PillTag highlight>Other: {application.otherHelpNeeded}</PillTag>
                  )}
                </div>
              ) : application.otherHelpNeeded ? (
                <PillTag highlight>Other: {application.otherHelpNeeded}</PillTag>
              ) : (
                <p className="text-[14px] italic text-[#A3A3A3]">No specific categories selected</p>
              )}
            </div>

            {/* Project description */}
            {application.projectDescription && (
              <div className="mt-6 space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  Project Description
                </h3>
                <div className="rounded-xl border-l-4 border-[#C89B3C] bg-[#FBFAF6] p-4 text-[14px] leading-relaxed text-[#2A2A2A] shadow-inner whitespace-pre-wrap">
                  {application.projectDescription}
                </div>
              </div>
            )}

            {/* Challenges */}
            {(Boolean(application.challenges?.length) || application.otherChallenge) && (
              <div className="mt-6 space-y-3">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  Key Challenges
                </h3>
                <div className="flex flex-wrap gap-2">
                  {application.challenges?.map((item, idx) => (
                    <PillTag key={idx}>{item}</PillTag>
                  ))}
                  {application.otherChallenge && (
                    <PillTag>Other: {application.otherChallenge}</PillTag>
                  )}
                </div>
              </div>
            )}

            {/* Desired outcome */}
            {application.desiredOutcome && (
              <div className="mt-6 space-y-2">
                <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  <TrendingUp className="h-3.5 w-3.5 text-[#C89B3C]" /> Desired Outcome
                </h3>
                <p className="rounded-lg bg-[#FAF8F2] p-3 text-[14px] leading-relaxed text-[#2A2A2A]">
                  {application.desiredOutcome}
                </p>
              </div>
            )}

            {/* Current solution */}
            {application.currentSolutionType && (
              <div className="mt-6 space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  Current Solution In Place
                </h3>
                <p className="text-[14px] text-[#2A2A2A]">
                  {application.currentSolutionType}
                </p>
              </div>
            )}
          </Card>

          {/* Scope, Timeline & Budget */}
          <Card className="p-6 md:p-7">
            <SectionHeading
              icon={Sparkles}
              title="Scope, Services & Timeline"
              subtitle="Engagement details, budget and expected milestones"
            />

            {/* Services */}
            <div className="space-y-3">
              <h3 className="text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                Requested Services
              </h3>
              {application.services && application.services.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {application.services.map((item, idx) => (
                    <PillTag key={idx} highlight>{item}</PillTag>
                  ))}
                  {application.otherService && (
                    <PillTag highlight>Other: {application.otherService}</PillTag>
                  )}
                </div>
              ) : application.otherService ? (
                <PillTag highlight>Other: {application.otherService}</PillTag>
              ) : (
                <p className="text-[14px] italic text-[#A3A3A3]">No specific services selected</p>
              )}
            </div>

            {/* Key specs grid */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[#ECEAE3] bg-[#FBFAF6] p-4">
                <div className="flex items-center gap-2 text-[#C89B3C]">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                    Budget Range
                  </span>
                </div>
                <p className="mt-1 text-[16px] font-semibold text-[#1A1A1A]">
                  {application.budgetRange || 'Not specified'}
                </p>
              </div>

              <div className="rounded-xl border border-[#ECEAE3] bg-[#FBFAF6] p-4">
                <div className="flex items-center gap-2 text-[#C89B3C]">
                  <Calendar className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                    Target Start Date
                  </span>
                </div>
                <p className="mt-1 text-[16px] font-semibold text-[#1A1A1A]">
                  {application.startTime || 'Not specified'}
                </p>
              </div>

              <div className="rounded-xl border border-[#ECEAE3] bg-[#FBFAF6] p-4">
                <div className="flex items-center gap-2 text-[#C89B3C]">
                  <Clock className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                    Project Deadline
                  </span>
                </div>
                <p className="mt-1 text-[16px] font-semibold text-[#1A1A1A]">
                  {application.deadline || 'Not specified'}
                </p>
              </div>

              <div className="rounded-xl border border-[#ECEAE3] bg-[#FBFAF6] p-4">
                <div className="flex items-center gap-2 text-[#C89B3C]">
                  <Users className="h-4 w-4" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                    Decision Makers
                  </span>
                </div>
                <p className="mt-1 text-[15px] font-semibold text-[#1A1A1A]">
                  {application.decisionMakers || 'Not specified'}
                </p>
                {application.otherStakeholders && (
                  <p className="mt-0.5 text-[12px] text-[#8A8A8A]">
                    Stakeholders: {application.otherStakeholders}
                  </p>
                )}
              </div>
            </div>

            {/* Additional notes */}
            {application.additionalNotes && (
              <div className="mt-6 space-y-2">
                <h3 className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                  <FileText className="h-3.5 w-3.5 text-[#C89B3C]" /> Additional Notes
                </h3>
                <div className="rounded-lg bg-[#FAF8F2] p-4 text-[14px] leading-relaxed text-[#2A2A2A] whitespace-pre-wrap">
                  {application.additionalNotes}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Contact Details Card */}
          <Card className="p-6">
            <SectionHeading icon={User} title="Contact Details" />

            <div className="divide-y divide-[#F0EEE8]">
              <DetailRow
                label="Full Name"
                value={<span className="font-semibold">{fullName}</span>}
              />
              <DetailRow
                label="Role"
                value={application.role || application.otherRole || 'Not provided'}
              />
              <DetailRow
                label="Email"
                value={
                  <a
                    href={`mailto:${application.email}`}
                    className="font-medium text-[#C89B3C] hover:underline"
                  >
                    {application.email}
                  </a>
                }
                action={<CopyAction text={application.email} label="Copy email" />}
              />
              {application.phone && (
                <DetailRow
                  label="Phone"
                  value={
                    <a
                      href={`tel:${application.phone}`}
                      className="font-medium text-[#1A1A1A] hover:underline"
                    >
                      {application.phone}
                    </a>
                  }
                  action={<CopyAction text={application.phone} label="Copy phone" />}
                />
              )}
              {application.linkedin && (
                <DetailRow
                  label="LinkedIn"
                  value={
                    <a
                      href={
                        application.linkedin.startsWith('http')
                          ? application.linkedin
                          : `https://${application.linkedin}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#0A66C2] hover:underline"
                    >
                      <BsLinkedin className="h-3.5 w-3.5" /> Profile{' '}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
            </div>

            {application.email && (
              <div className="mt-4 pt-2">
                <a
                  href={`mailto:${application.email}?subject=${encodeURIComponent(
                    `Regarding your partnership application with Agunwami Enterprise`
                  )}`}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1F1F1F] py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-black"
                >
                  <Mail className="h-4 w-4" /> Direct Email
                </a>
              </div>
            )}
          </Card>

          {/* Organization Profile Card */}
          <Card className="p-6">
            <SectionHeading icon={Building2} title="Organization Profile" />

            <div className="divide-y divide-[#F0EEE8]">
              <DetailRow
                label="Organization"
                value={
                  <span className="font-semibold text-[#1A1A1A]">
                    {application.orgName || 'Not provided'}
                  </span>
                }
              />
              <DetailRow label="Type" value={application.orgType} />
              <DetailRow label="Industry" value={application.industry} />
              <DetailRow label="Company Size" value={application.orgSize} />
              <DetailRow
                label="Location"
                value={
                  application.location ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-[#C89B3C]" />
                      {application.location}
                    </span>
                  ) : null
                }
              />
              <DetailRow
                label="Years Active"
                value={application.yearsInOperation}
              />
              {application.website && (
                <DetailRow
                  label="Website"
                  value={
                    <a
                      href={
                        application.website.startsWith('http')
                          ? application.website
                          : `https://${application.website}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-[#C89B3C] hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> Visit site{' '}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  }
                />
              )}
            </div>
          </Card>

          {/* Record Metadata Card */}
          <Card className="p-6">
            <SectionHeading icon={CheckCircle2} title="Submission Record" />

            <div className="space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Application ID</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#6B6B6B]">
                  <span>{application.id.slice(0, 12)}…</span>
                  <CopyAction text={application.id} label="Copy ID" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Received</span>
                <span className="text-[#1A1A1A]">{formattedDate}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#8A8A8A]">Current Status</span>
                <span
                  className={cx(
                    'rounded-md px-2 py-0.5 text-[11px] font-semibold',
                    STATUS_STYLES[application.status]
                  )}
                >
                  {statusLabel(application.status)}
                </span>
              </div>

              {application.flaggedAsSpam && (
                <div className="flex items-center justify-between">
                  <span className="text-[#8A8A8A]">Spam Flag</span>
                  <SpamBadge />
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmDelete
        open={confirmDelete}
        kind="Application"
        name={fullName}
        effect="The submission will be permanently removed from the C-panel."
        busy={del.busy}
        error={del.error}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
