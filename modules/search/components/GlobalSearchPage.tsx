'use client';

import { useState } from 'react';

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL SEARCH — searches across all four projects. Static mock UI.
═══════════════════════════════════════════════════════════════════════════ */

const PROJECT_TAGS = [
  { label: 'AE Hub',   iconBg: '#fef3c7', iconColor: '#d97706' },
  { label: 'MCS',      iconBg: '#dbeafe', iconColor: '#2563eb' },
  { label: 'AWA',      iconBg: '#fce7f3', iconColor: '#db2777' },
  { label: 'Trendora', iconBg: '#dcfce7', iconColor: '#16a34a' },
];

const RECENT_SEARCHES = ['Joshua', 'Amaka Okafor', 'NovaTech', 'Python Bootcamp', 'AWA payroll'];

export default function GlobalSearchPage() {
  const [query, setQuery] = useState('');

  return (
    <div className="space-y-4 p-4 md:p-5">
      <div>
        <h1 className="text-[19px] font-bold leading-tight text-gray-800 dark:text-white">Global Search</h1>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage your time off and leave requests</p>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/10">
            <SearchIcon />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, ID, role, company, product, or keyword..."
              className="w-full bg-transparent text-[12px] text-gray-700 placeholder-gray-400 outline-none dark:text-gray-200"
            />
          </div>
          <button className="rounded-lg bg-[#f5bd02] px-5 py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">Search All</button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
          <span>Searching across:</span>
          {PROJECT_TAGS.map(p => (
            <span key={p.label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ backgroundColor: p.iconBg, color: p.iconColor }}>
              {p.label}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <p className="text-[12px] font-medium text-gray-600 dark:text-gray-300">Recent Searches</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {RECENT_SEARCHES.map(term => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] text-gray-600 hover:bg-gray-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <SearchIcon size={11} /> {term}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center justify-center rounded-2xl bg-white py-16 text-center shadow-sm dark:bg-[#1e1e1e]">
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef3c7]">
          <SearchIcon size={22} color="#d97706" />
        </div>
        <p className="text-[13px] font-medium text-gray-700 dark:text-gray-200">
          {query ? `No results yet for "${query}"` : 'Enter a name, ID, email, or keyword'}
        </p>
        <p className="mt-1 text-[11px] text-gray-400">Results will appear grouped by project</p>
        <div className="mt-4 flex items-center gap-3">
          {PROJECT_TAGS.map(p => (
            <span key={p.label} className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.iconColor }} /> {p.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchIcon({ size = 14, color }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color ?? 'currentColor'} strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 text-gray-400">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
