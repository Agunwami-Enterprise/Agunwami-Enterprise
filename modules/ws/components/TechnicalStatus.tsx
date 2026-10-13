'use client';

/**
 * Department workstation → Technical Status (/ws/technical-status): the
 * Agunwami Enterprise website and each project's site, checked from the
 * server: up or down, response time, SSL certificate expiry and the last
 * day's checks (one every five minutes), with failures listed as incidents.
 */

import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, Globe, Lock, RefreshCw, Server, Timer } from 'lucide-react';
import type { SiteStatus } from '@/backend/modules/status/status.service';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, btnGhost } from './ui';

const daysUntil = (iso: string | null, now: number) => (iso ? Math.floor((new Date(iso).getTime() - now) / 86_400_000) : null);
const timeAgo = (iso: string) => new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function TechnicalStatus() {
  const [sites, setSites] = useState<SiteStatus[] | null>(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/ws/status${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
      setSites(body.sites ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Status checks could not be loaded.');
      setSites(current => current ?? []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    const every = setInterval(() => void load(), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [load]);

  const list = sites ?? [];
  // When the checks ran (the server's time), for SSL days left and the 24-hour window.
  const now = list[0] ? new Date(list[0].checkedAt).getTime() : 0;
  const up = list.filter(s => s.ok).length;
  const times = list.map(s => s.ms).filter((ms): ms is number => ms !== null);
  const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : null;
  const sslSoon = list.filter(s => { const d = daysUntil(s.sslValidTo, now); return d !== null && d <= 21; });
  const incidents = list.flatMap(site => site.incidents.map(c => ({ site, check: c })))
    .sort((a, b) => b.check.at.localeCompare(a.check.at)).slice(0, 12);

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Technical Status" subtitle="Website and project sites, checked from the server every minute"
        actions={<button className={btnGhost} onClick={() => void load(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden /> {refreshing ? 'Checking…' : 'Check now'}
        </button>} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Sites Up" icon={Activity} iconClass={up === list.length ? 'text-[#16a34a]' : 'text-[#ef4444]'}
          value={sites === null ? '…' : `${up}/${list.length}`} sub={up === list.length ? 'Everything is responding' : `${list.length - up} not responding`} />
        <StatTile label="Avg Response" icon={Timer} iconClass="text-[#2563eb]" value={avg === null ? '—' : `${avg} ms`} sub="Across responding sites" />
        <StatTile label="SSL Certificates" icon={Lock} iconClass={sslSoon.length ? 'text-[#f59e0b]' : 'text-[#16a34a]'}
          value={sites === null ? '…' : String(sslSoon.length)} sub={sslSoon.length ? 'Expire within 3 weeks' : 'None expiring soon'} />
        <StatTile label="Incidents (24h)" icon={AlertTriangle} iconClass="text-[#ef4444]"
          value={sites === null ? '…' : String(list.reduce((n, s) => n + s.incidents.length, 0))}
          sub="Failed checks in the last day" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title="Sites" icon={Globe}>
        {sites === null ? <Empty>Checking…</Empty> : list.length === 0 ? <Empty>No sites to check.</Empty> : (
          <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
            {list.map(site => {
              const days = daysUntil(site.sslValidTo, now);
              return (
                <li key={site.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#292929] dark:text-white">
                      {site.name}
                      <Pill label={site.ok ? 'Operational' : 'Down'} tone={site.ok ? 'green' : 'red'} />
                    </p>
                    <a href={site.url} target="_blank" rel="noreferrer" className="truncate text-[13px] text-[#b38a00] hover:underline dark:text-[#f5bd02]">{site.url}</a>
                    <p className="text-[13px] text-[#656565] dark:text-gray-400">
                      {[site.ms !== null ? `${site.ms} ms` : site.error, site.code ? `HTTP ${site.code}` : null,
                        site.uptime24h !== null ? `${site.uptime24h}% up (24h)` : null,
                        days !== null ? (days < 0 ? 'SSL expired' : `SSL ${days} days left`) : 'SSL not read'].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex items-end gap-[2px]" aria-label={`Last ${site.history.length} checks`}>
                    {site.history.map(check => (
                      <span key={check.at} title={`${timeAgo(check.at)}: ${check.ok ? `${check.ms ?? '?'} ms` : 'failed'}`}
                        className={`h-6 w-1.5 rounded-sm ${check.ok ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Recent Incidents" icon={AlertTriangle} iconClass="text-[#ef4444]">
          {incidents.length === 0 ? <Empty>No failed checks in the last 24 hours.</Empty> : (
            <ul className="space-y-2">
              {incidents.map(({ site, check }) => (
                <li key={`${site.id}-${check.at}`} className="flex justify-between gap-3 text-[14px]">
                  <span className="text-[#292929] dark:text-gray-200">{site.name} {check.code ? `returned HTTP ${check.code}` : 'didn’t respond'}</span>
                  <span className="shrink-0 text-[#656565] dark:text-gray-400">{timeAgo(check.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Hosting & Deployments" icon={Server} iconClass="text-[#525252] dark:text-gray-300">
          <p className="mb-3 text-[13px] text-[#656565] dark:text-gray-400">
            Uptime and SSL above come from checking each site directly. Server metrics and deployment history need the hosting provider.
          </p>
          <div className="rounded-lg border border-dashed border-[#bdbdbd] px-4 py-4 text-center text-[12px] text-[#656565] dark:border-white/15 dark:text-gray-400">
            Not connected yet. Connect <span className="font-semibold">your hosting provider</span> for CPU, memory and deployments.
          </div>
        </Card>
      </div>
    </div>
  );
}
