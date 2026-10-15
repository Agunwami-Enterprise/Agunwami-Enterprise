'use client';

/**
 * Shared pieces for CEO pages that list the enterprise's own records next to
 * records reported by each project's metrics endpoint: loading a feed, the
 * label that says where an item came from, a source filter, and notes for
 * projects whose data is missing or out of date.
 */

import { useCallback, useEffect, useState } from 'react';
import type { FeedSource, ProjectFeedStatus } from '@/backend/modules/projects/projects.types';

/** Loads `url` once (and on `reload`), reporting loading and error states. */
export function useFeed<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status}).`);
      setData(body as T);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this page.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    const first = setTimeout(() => { void reload(); }, 0);
    return () => clearTimeout(first);
  }, [reload]);

  return { data, setData, error, loading, reload };
}

/** Coloured label naming the enterprise or project an item came from. */
export function SourceBadge({ source }: { source: FeedSource }) {
  return (
    <span
      className="inline-flex max-w-[160px] items-center truncate rounded-sm px-1.5 py-0.5 text-[10px] font-bold text-white"
      style={{ backgroundColor: source.color }}
      title={source.kind === 'project' ? `Reported by the ${source.name} project` : source.name}
    >
      {source.name}
    </span>
  );
}

export const ALL_SOURCES = 'all';

/** Every distinct source in `items`, the enterprise first. */
export function sourcesOf(items: Array<{ source: FeedSource }>): FeedSource[] {
  const byId = new Map<string, FeedSource>();
  for (const { source } of items) byId.set(source.id, source);
  return [...byId.values()].sort((a, b) =>
    (a.kind === 'enterprise' ? -1 : b.kind === 'enterprise' ? 1 : a.name.localeCompare(b.name)));
}

export function SourceFilter({ sources, value, onChange }: {
  sources: FeedSource[];
  value: string;
  onChange: (value: string) => void;
}) {
  if (sources.length < 2) return null;
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      aria-label="Filter by project"
      className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200"
    >
      <option value={ALL_SOURCES}>All projects</option>
      {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
    </select>
  );
}

/**
 * Explains gaps: the enterprise's records couldn't be read, a project's
 * endpoint failed, it doesn't send this section yet, or its data is stale.
 */
export function FeedNotices({ projects, enterpriseError, section }: {
  projects: ProjectFeedStatus[];
  enterpriseError?: string;
  /** Plural noun for this page's records, e.g. "payments". */
  section: string;
}) {
  const notes: Array<{ key: string; tone: 'error' | 'warning' | 'info'; text: string }> = [];
  if (enterpriseError) notes.push({ key: 'enterprise', tone: 'error', text: enterpriseError });
  for (const project of projects) {
    if (project.error) {
      notes.push({ key: project.id, tone: 'error', text: `${project.name}: its metrics endpoint failed, so its ${section} are not shown (${project.error}).` });
    } else if (project.stale) {
      const when = project.lastSyncedAt ? new Date(project.lastSyncedAt).toLocaleString() : 'the last sync';
      notes.push({ key: project.id, tone: 'warning', text: `${project.name}: its endpoint is unreachable, showing ${section} from ${when}.` });
    } else if (project.missing) {
      notes.push({ key: project.id, tone: 'info', text: `${project.name} doesn't send ${section} from its metrics endpoint yet.` });
    }
  }
  if (!notes.length) return null;
  const styles = {
    error: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    warning: 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300',
    info: 'bg-gray-50 text-gray-600 dark:bg-white/5 dark:text-gray-400',
  };
  return (
    <div className="mb-4 flex flex-col gap-2">
      {notes.map(note => (
        <p key={note.key} role={note.tone === 'error' ? 'alert' : 'status'} className={`rounded-xl px-4 py-2.5 text-[12px] ${styles[note.tone]}`}>
          {note.text}
        </p>
      ))}
    </div>
  );
}

/** Full-page message when a feed could not be loaded at all. */
export function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="p-4 md:p-5">
      <div className="rounded-2xl bg-white p-6 text-center shadow-sm dark:bg-[#1e1e1e]">
        <p className="text-[13px] text-red-600 dark:text-red-400">This page could not be loaded: {message}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-300"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

/** "₦15,000.00"; falls back to "NGN 15,000" for unknown currency codes. */
export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`;
  }
}

/** Sums per currency, e.g. "₦250,000.00 + $40.00", so currencies never mix. */
export function formatTotals(items: Array<{ amount: number; currency: string }>): string {
  const totals = new Map<string, number>();
  for (const item of items) totals.set(item.currency, (totals.get(item.currency) ?? 0) + item.amount);
  if (!totals.size) return formatMoney(0, 'NGN');
  return [...totals.entries()].map(([currency, total]) => formatMoney(total, currency)).join(' + ');
}

export function formatDate(iso: string | null, withTime = false): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '-';
  return withTime
    ? date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
