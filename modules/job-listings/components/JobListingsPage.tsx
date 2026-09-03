'use client';

import { useState, type ReactNode } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   JOB LISTINGS — part of the MCS (Meridian Crest Solutions) jobs platform.
   Static mock data, matches approved design.
═══════════════════════════════════════════════════════════════════════════ */

type ListingStatus = 'open' | 'draft' | 'closed';
type FilterTab = 'All' | 'Open' | 'Draft' | 'Closed';

interface Listing {
  title: string;
  status: ListingStatus;
  type: string;
  dept: string;
  location: string;
  applicants: number;
  closes: string;
  description: string;
  requirements?: string[];
  postedBy?: string;
  postedOn?: string;
}

const LISTINGS: Listing[] = [
  {
    title: 'Sales Associate', status: 'open', type: 'full-time', dept: 'Sales', location: 'Lagos, Nigeria (Hybrid)',
    applicants: 14, closes: '6/20/2026',
    description: 'We are looking for a motivated Sales Associate to join our growing team. The ideal candidate will build relationships with clients and drive revenue growth.',
    requirements: ['2+ years sales experience', 'Excellent communication skills', 'Proficiency in CRM tools', "Bachelor's degree or equivalent"],
    postedBy: 'Ngozi Eze', postedOn: '5/20/2026',
  },
  {
    title: 'Frontend Developer', status: 'open', type: 'full-time', dept: 'Engineering', location: 'Remote',
    applicants: 27, closes: '6/30/2026',
    description: "Join our engineering team to build world-class web applications using React and TypeScript. You'll work closely with design and product teams.",
    requirements: ['3+ years with React/TypeScript', 'Strong CSS/design sense', 'Experience with REST APIs', 'Comfortable in a fast-moving team'],
    postedBy: 'Ngozi Eze', postedOn: '5/25/2026',
  },
  {
    title: 'Customer Support Specialist', status: 'closed', type: 'full-time', dept: 'Customer Service', location: 'Lagos, Nigeria (On-site)',
    applicants: 42, closes: '5/10/2026',
    description: 'Help our customers succeed by providing timely, empathetic support across multiple channels.',
    requirements: ['1+ years in customer support', 'Excellent written communication', 'Patience under pressure'],
    postedBy: 'Ngozi Eze', postedOn: '4/1/2026',
  },
  {
    title: 'HR Coordinator (Intern)', status: 'draft', type: 'internship', dept: 'HR', location: 'Lagos, Nigeria (Hybrid)',
    applicants: 0, closes: '—',
    description: 'Support our HR team with recruitment coordination, documentation, and onboarding processes.',
    requirements: ['Currently enrolled or recent graduate', 'Strong organizational skills', 'Interest in HR/People Ops'],
    postedBy: 'Ngozi Eze', postedOn: '—',
  },
];

const STATUS_STYLE: Record<ListingStatus, string> = {
  open: 'bg-[#dcfce7] text-[#16a34a]',
  draft: 'bg-[#fef3c7] text-[#b45309]',
  closed: 'bg-gray-200 text-gray-600 dark:bg-white/10 dark:text-gray-300',
};

export default function JobListingsPage() {
  const [tab, setTab] = useState<FilterTab>('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Listing | null>(null);

  const filtered = LISTINGS.filter(l => {
    const matchesTab = tab === 'All' || l.status === tab.toLowerCase();
    const matchesQuery = l.title.toLowerCase().includes(query.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const openCount = LISTINGS.filter(l => l.status === 'open').length;
  const draftCount = LISTINGS.filter(l => l.status === 'draft').length;
  const totalApplicants = LISTINGS.reduce((sum, l) => sum + l.applicants, 0);

  return (
    <div className="space-y-4 p-4 md:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">Job Listings</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage open positions and recruitment</p>
        </div>
        <button className="flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">
          <PlusIcon /> New Entry
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Open Positions" value={String(openCount)} iconBg="#dbeafe" iconColor="#2563eb" icon={<BriefcaseIcon />} />
        <StatCard label="Total Applicants" value={String(totalApplicants)} iconBg="#ede9fe" iconColor="#7c3aed" icon={<PeopleIcon />} />
        <StatCard label="Draft Listings" value={String(draftCount)} iconBg="#fef3c7" iconColor="#d97706" icon={<ClockIcon />} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
            <SearchIcon />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search listings..."
              className="w-full bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none dark:text-gray-200"
            />
          </div>
          <div className="flex flex-shrink-0 gap-1.5">
            {(['All', 'Open', 'Draft', 'Closed'] as FilterTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-2 text-[11px] font-medium ${
                  tab === t ? 'bg-[#f5bd02] text-[#1a1a1a]' : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {filtered.map(listing => (
            <button
              key={listing.title}
              onClick={() => setSelected(listing)}
              className="flex w-full items-start justify-between gap-3 rounded-lg border border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{listing.title}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[listing.status]}`}>{listing.status}</span>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{listing.type}</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  {listing.dept} · {listing.location} · {listing.applicants} applicants · Closes {listing.closes}
                </p>
                <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{listing.description}</p>
              </div>
              <span className="flex-shrink-0 text-gray-400">
                {listing.status === 'closed' || listing.status === 'draft' ? <EditIcon /> : <EyeOffIcon />}
              </span>
            </button>
          ))}
          {filtered.length === 0 && <p className="py-6 text-center text-[12px] text-gray-400">No listings match your search.</p>}
        </div>
      </div>

      {selected && <ListingModal listing={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function StatCard({ label, value, iconBg, iconColor, icon }: { label: string; value: string; iconBg: string; iconColor: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: iconBg, color: iconColor }}>{icon}</div>
      <div>
        <p className="text-[20px] font-bold leading-tight text-gray-800 dark:text-white">{value}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
  );
}

function ListingModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1e1e1e]" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[14px] font-semibold text-gray-800 dark:text-white">{listing.title}</p>
            <p className="text-[11px] text-gray-400">{listing.dept} · {listing.location}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <CloseIcon />
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[listing.status]}`}>{listing.status}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{listing.type}</span>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-white/10 dark:text-gray-300">{listing.applicants} applicants</span>
        </div>
        <p className="mt-3 text-[12px] text-gray-600 dark:text-gray-300">{listing.description}</p>
        {listing.requirements && (
          <div className="mt-3">
            <p className="text-[12px] font-medium text-gray-800 dark:text-white">Requirements</p>
            <ul className="mt-1 space-y-1">
              {listing.requirements.map(r => (
                <li key={r} className="flex items-start gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="mt-1 h-1 w-1 flex-shrink-0 rounded-full bg-[#f5bd02]" /> {r}
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-4 text-[10px] text-gray-400">Posted by {listing.postedBy} on {listing.postedOn} · Closes {listing.closes}</p>
      </div>
    </div>
  );
}

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 text-gray-400"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function BriefcaseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>;
}
function PeopleIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}
function ClockIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12,6 12,12 16,14" /></svg>;
}
function EyeOffIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.06-5.94M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>;
}
function EditIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4z" /></svg>;
}
function PlusIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function CloseIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
