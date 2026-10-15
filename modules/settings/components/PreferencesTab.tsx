'use client';

/**
 * Settings → Preferences: appearance, animations, time zone, start page and
 * language. Each change saves immediately.
 */

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme as useAppTheme } from '@/app/components/common/ThemeProvider';
import {
  DEFAULT_START_PAGE, START_PAGES, allTimeZones, cityName, deviceTimeZone, getStartPage,
  saveStartPage, setReduceMotion, useReduceMotion, utcOffsetLabel,
} from '@/lib/workstation/preferences';
import { TIME_ZONES } from '@/modules/settings/services';

type Status = { tone: 'success' | 'error'; text: string } | null;
type ThemeChoice = 'light' | 'dark' | 'system';

const errorText = (err: unknown) => (err instanceof Error && err.message) || 'Something went wrong. Please try again.';

// Client-only values, read without a hydration mismatch (the server's time
// zone and zone list can differ from the browser's).
const noSubscribe = () => () => {};
let zoneListCache: string[] | null | undefined;
const zoneList = () => (zoneListCache === undefined ? (zoneListCache = allTimeZones()) : zoneListCache);

export function timeZoneLabel(timeZone: string): string {
  const common = TIME_ZONES.find(zone => zone.value === timeZone);
  if (common) return common.label;
  const offset = utcOffsetLabel(timeZone);
  return offset ? `${cityName(timeZone)} (${offset})` : cityName(timeZone);
}

export default function PreferencesTab({ uid, timeZone, profileLoaded, onTimeZone, status }: {
  uid: string | undefined;
  timeZone: string;
  profileLoaded: boolean;
  onTimeZone: (timeZone: string) => Promise<void>;
  status: Status;
}) {
  const { theme, setTheme } = useAppTheme();
  // The start page lists CEO workstation pages; other workstations have their own home.
  const showStartPage = !usePathname().startsWith('/ws');
  const reduceMotion = useReduceMotion();
  const device = useSyncExternalStore(noSubscribe, deviceTimeZone, () => null);
  const zones = useSyncExternalStore(noSubscribe, zoneList, () => null);
  const [startPage, setStartPage] = useState<string | null>(null);
  const [localStatus, setLocalStatus] = useState<Status>(null);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    getStartPage(uid).then(page => { if (!cancelled) setStartPage(page); });
    return () => { cancelled = true; };
  }, [uid]);

  // The clock beside the time zone, refreshed every 30 seconds.
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const every = setInterval(tick, 30_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  // Every zone grouped by region, with the common ones first.
  const groups = useMemo(() => {
    if (!zones) return null;
    const at = new Date();
    const byRegion = new Map<string, Array<{ value: string; label: string }>>();
    for (const zone of zones) {
      const region = zone.includes('/') ? zone.split('/')[0] : 'Other';
      const offset = utcOffsetLabel(zone, at);
      const list = byRegion.get(region) ?? [];
      list.push({ value: zone, label: `${zone.split('/').slice(1).join(' / ').replace(/_/g, ' ') || zone}${offset ? ` (${offset})` : ''}` });
      byRegion.set(region, list);
    }
    return [...byRegion.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [zones]);

  async function chooseStartPage(value: string) {
    if (!uid) return;
    const previous = startPage;
    setStartPage(value);
    setLocalStatus(null);
    try {
      await saveStartPage(uid, value);
      setLocalStatus({ tone: 'success', text: `You'll start on ${START_PAGES.find(p => p.value === value)?.label ?? 'that page'} after signing in.` });
    } catch (err) {
      setStartPage(previous);
      setLocalStatus({ tone: 'error', text: `Could not save your start page: ${errorText(err)}` });
    }
  }

  const shown = localStatus ?? status;
  const clock = now
    ? new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', weekday: 'short' }).format(now)
    : '';

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Preferences</h2>
      <p className="mb-2 text-[12px] text-gray-500 dark:text-gray-400">Customize how the workstation looks and works for you</p>
      {shown && (
        <p
          role={shown.tone === 'error' ? 'alert' : 'status'}
          className={`mb-2 rounded-xl px-4 py-2.5 text-[12px] ${shown.tone === 'error'
            ? 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300'
            : 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300'}`}
        >
          {shown.text}
        </p>
      )}

      {/* Appearance */}
      <Row title="Appearance" desc={theme === 'system' ? 'Follows your device’s light or dark setting' : 'Saved on this device'}>
        <Segmented<ThemeChoice>
          label="Appearance"
          value={theme}
          onChange={setTheme}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]}
        />
      </Row>

      {/* Animations */}
      <Row title="Reduce animations" desc="Turn off page transitions and motion effects on this device">
        <Switch on={reduceMotion} onChange={setReduceMotion} label="Reduce animations" />
      </Row>

      {/* Time zone */}
      <div className="flex flex-col gap-3 border-b border-gray-100 py-5 sm:flex-row sm:items-start sm:justify-between dark:border-white/6">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-gray-800 dark:text-white">Time Zone</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Used for your attendance and lateness in AE Hub reports</p>
          {clock && <p className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">It’s {clock} there now</p>}
        </div>
        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <div className="relative">
            <select
              value={timeZone}
              disabled={!profileLoaded}
              onChange={e => void onTimeZone(e.target.value)}
              aria-label="Time zone"
              className="w-full max-w-[280px] appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[12px] font-medium text-gray-700 outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
            >
              <optgroup label="Common">
                {TIME_ZONES.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
              </optgroup>
              {groups
                ? groups.map(([region, list]) => (
                  <optgroup key={region} label={region}>
                    {list.map(zone => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
                  </optgroup>
                ))
                : !TIME_ZONES.some(zone => zone.value === timeZone) && <option value={timeZone}>{timeZoneLabel(timeZone)}</option>}
            </select>
            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>
            </span>
          </div>
          {device && device !== timeZone && profileLoaded && (
            <button
              type="button"
              onClick={() => void onTimeZone(device)}
              className="text-left text-[11px] font-semibold text-[#b38a00] hover:underline sm:text-right dark:text-[#f5bd02]"
            >
              Use this device’s time zone ({timeZoneLabel(device)})
            </button>
          )}
        </div>
      </div>

      {/* Start page */}
      {showStartPage && <Row title="Start page" desc="Where you land after signing in">
        <div className="relative">
          <select
            value={startPage ?? DEFAULT_START_PAGE}
            disabled={!uid || startPage === null}
            onChange={e => void chooseStartPage(e.target.value)}
            aria-label="Start page"
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-[12px] font-medium text-gray-700 outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-200"
          >
            {START_PAGES.map(page => <option key={page.value} value={page.value}>{page.label}</option>)}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>
          </span>
        </div>
      </Row>}

      {/* Language */}
      <div className="flex items-center justify-between pt-5">
        <div>
          <p className="flex items-center gap-2 text-[13px] font-semibold text-gray-800 dark:text-white">
            Language
            <span className="rounded-md bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-gray-500 dark:bg-white/8 dark:text-gray-400">Coming soon</span>
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">The workstation is in English for now</p>
        </div>
        <span className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-medium text-gray-500 dark:border-white/10 dark:text-gray-400">English</span>
      </div>
    </div>
  );
}

function Row({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-gray-100 py-5 sm:flex-row sm:items-center sm:justify-between dark:border-white/6">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-gray-800 dark:text-white">{title}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-[26px] w-[46px] flex-shrink-0 self-start overflow-hidden rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f5bd02]/50 sm:self-auto
        ${on ? 'bg-[#f5bd02]' : 'bg-gray-300 dark:bg-gray-600'}`}
    >
      <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-white shadow transition-transform duration-200
        ${on ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-shrink-0 self-start rounded-lg bg-gray-100 p-0.5 sm:self-auto dark:bg-white/8">
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${value === option.value
            ? 'bg-white text-gray-800 shadow-sm dark:bg-[#2a2a2a] dark:text-white'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
