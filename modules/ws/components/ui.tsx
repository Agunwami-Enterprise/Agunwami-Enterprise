'use client';

/**
 * Building blocks shared by the department workstation pages (/ws), in the
 * AE Workstation Figma design's tokens: stat tiles, cards, tags, tabs and
 * the empty / not-connected states.
 */

import type { LucideIcon } from 'lucide-react';

const TAG_STYLES = [
  'bg-[#dbeafe] text-[#193cb8]',
  'bg-[#dcfce7] text-[#016630]',
  'bg-[#f3e8ff] text-[#6e11b0]',
  'bg-[#fef9c2] text-[#894b00]',
];

function tagStyle(label: string): string {
  let hash = 0;
  for (const ch of label.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TAG_STYLES[hash % TAG_STYLES.length];
}

export function Tag({ label }: { label: string }) {
  return <span className={`shrink-0 rounded-[4px] px-1.5 py-0.5 text-[13px] font-medium leading-5 ${tagStyle(label)}`}>{label}</span>;
}

/** A coloured status pill. */
export function Pill({ label, tone }: { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'purple' }) {
  const styles = {
    green: 'bg-[#dcfce7] text-[#016630] dark:bg-green-500/15 dark:text-green-300',
    amber: 'bg-[#fef9c2] text-[#894b00] dark:bg-amber-500/15 dark:text-amber-300',
    red: 'bg-[#fee2e2] text-[#b91c1c] dark:bg-red-500/15 dark:text-red-300',
    blue: 'bg-[#dbeafe] text-[#193cb8] dark:bg-blue-500/15 dark:text-blue-300',
    purple: 'bg-[#f3e8ff] text-[#6e11b0] dark:bg-purple-500/15 dark:text-purple-300',
    gray: 'bg-[#f3f4f6] text-[#525252] dark:bg-white/8 dark:text-gray-300',
  };
  return <span className={`inline-block shrink-0 rounded-[4px] px-1.5 py-0.5 text-[12px] font-medium leading-5 ${styles[tone]}`}>{label}</span>;
}

export function StatTile({ label, value, sub, icon: Icon, iconClass, muted = false }: {
  label: string; value: string; sub: string; icon: LucideIcon; iconClass: string; muted?: boolean;
}) {
  return (
    <div className="rounded-lg bg-[#fafafa] px-[17px] py-[25px] drop-shadow-[0px_4px_2px_rgba(0,0,0,0.16)] dark:bg-[#1e1e1e]">
      <div className="flex items-center gap-1.5">
        <p className="min-w-0 flex-1 text-[16px] leading-6 text-[#656565] dark:text-gray-400">{label}</p>
        <Icon className={`h-[18px] w-[18px] shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
      </div>
      <p className={`mt-1 text-[24px] font-semibold leading-8 ${muted ? 'text-[#bdbdbd] dark:text-gray-600' : 'text-black dark:text-white'}`}>{value}</p>
      <p className="truncate text-[14px] leading-5 text-[#656565] dark:text-gray-400">{sub}</p>
    </div>
  );
}

export function Card({ title, icon: Icon, iconClass = 'text-[#f5bd02]', action, children, className = '' }: {
  title: string; icon: LucideIcon; iconClass?: string; action?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <section className={`rounded-lg bg-[#fafafa] drop-shadow-[0px_4px_5.15px_rgba(0,0,0,0.25)] dark:bg-[#1e1e1e] ${className}`}>
      <div className="flex flex-wrap items-center gap-2 px-[22.5px] pb-[7.5px] pt-[22.5px]">
        <Icon className={`h-[15px] w-[15px] shrink-0 ${iconClass}`} strokeWidth={2} aria-hidden />
        <h2 className="min-w-0 flex-1 text-[16px] font-semibold leading-6 text-[#292929] dark:text-white">{title}</h2>
        {action}
      </div>
      <div className="px-[22.5px] pb-[22.5px] pt-2">{children}</div>
    </section>
  );
}

/** A card body for data whose source isn't connected yet. */
export function NotConnected({ source, detail }: { source: string; detail: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#bdbdbd] px-4 py-5 text-center dark:border-white/15">
      <p className="text-[13px] font-semibold text-[#525252] dark:text-gray-300">Not connected yet</p>
      <p className="mt-1 text-[12px] leading-5 text-[#656565] dark:text-gray-400">
        {detail} Connect <span className="font-semibold">{source}</span> to fill this in.
      </p>
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-2 text-[14px] leading-5 text-[#656565] dark:text-gray-400">{children}</p>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p role="alert" className="rounded-lg bg-[#fee2e2] px-4 py-2.5 text-[13px] text-[#b91c1c] dark:bg-red-500/10 dark:text-red-300">{children}</p>;
}

/** Page title row with optional actions on the right. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle: string; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-[24px] font-semibold leading-8 text-[#292929] dark:text-white">{title}</h1>
        <p className="text-[16px] leading-6 text-[#656565] dark:text-gray-400">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** Underlined tabs, as in the design's tab bars. */
export function Tabs<T extends string>({ tabs, value, onChange }: {
  tabs: Array<{ id: T; label: string; badge?: number }>; value: T; onChange: (id: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-[#e5e5e5] dark:border-white/10">
      {tabs.map(tab => (
        <button key={tab.id} role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)}
          className={`relative flex shrink-0 items-center gap-1.5 px-4 py-2.5 text-[14px] font-medium transition-colors ${value === tab.id ? 'text-[#292929] dark:text-white' : 'text-[#8a8a8a] hover:text-[#525252] dark:hover:text-gray-300'}`}>
          {tab.label}
          {tab.badge ? <span className="rounded-full bg-[#f5bd02] px-1.5 text-[11px] font-bold leading-4 text-[#1a1a1a]">{tab.badge}</span> : null}
          {value === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#f5bd02]" />}
        </button>
      ))}
    </div>
  );
}

export const btnPrimary = 'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50';
export const btnGhost = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5';
export const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Downloads rows as a CSV file (cells guarded against spreadsheet formulas). */
export function downloadCsv(filename: string, header: string[], rows: Array<Array<string | number>>) {
  const cell = (raw: string | number) => {
    const value = String(raw);
    return `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
  };
  const csv = [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
