/**
 * The CEO's page for one project (Figma: CEO Workstation → AEHub / MCS / AWA /
 * Trendora pages). Everything comes from the project's metrics endpoint; the
 * "Top items" chart and "Recent records" table fall back to departments and
 * tasks for endpoints that don't send them (see backend/README.md).
 */

import Link from 'next/link';
import {
  Activity, AlertCircle, ArrowDownRight, Bell, ArrowLeft, ArrowUpRight, BookOpen, CheckSquare, Clock, DollarSign,
  ExternalLink, LayoutDashboard, Megaphone, Package, Pencil, RotateCcw, ShoppingBag, TrendingUp, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';
import SiteIcon from '@/app/components/common/SiteIcon';
import type {
  ProjectApprovalItem, ProjectCardData, ProjectCardMetric, ProjectNotification, ProjectRecordTone,
} from '@/backend/modules/projects/projects.types';
import type { SiteIconName } from '@/backend/modules/site-content/site-content.types';
import RefreshButton from './RefreshButton';

const cx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

/** Picks a KPI icon from its label. */
const METRIC_ICONS: [RegExp, LucideIcon, string][] = [
  [/revenue|income|sales|gmv/i, DollarSign, 'text-emerald-600'],
  [/expend|cost|expense|payout|salary/i, Wallet, 'text-rose-500'],
  [/order/i, ShoppingBag, 'text-amber-500'],
  [/product|inventory|stock/i, Package, 'text-indigo-500'],
  [/refund|return/i, RotateCcw, 'text-rose-500'],
  [/campaign|marketing/i, Megaphone, 'text-teal-500'],
  [/course|enrol|lesson/i, BookOpen, 'text-amber-600'],
  [/approval|task|request/i, CheckSquare, 'text-sky-600'],
  [/duty|attendance|hour|time/i, Clock, 'text-orange-500'],
  [/rate|conversion|growth|health/i, TrendingUp, 'text-emerald-600'],
  [/student|customer|user|member|staff|people|client/i, Users, 'text-purple-500'],
];

function metricIcon(label: string): { Icon: LucideIcon; color: string } {
  const found = METRIC_ICONS.find(([pattern]) => pattern.test(label));
  return found ? { Icon: found[1], color: found[2] } : { Icon: Activity, color: 'text-gray-400' };
}

const TONES: Record<ProjectRecordTone, string> = {
  success: 'bg-emerald-500 text-white',
  info: 'bg-blue-500 text-white',
  warning: 'bg-amber-400 text-gray-900',
  danger: 'bg-rose-500 text-white',
  neutral: 'bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-200',
};

function compactNumber(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

const card = 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]';

function KpiCard({ metric }: { metric: ProjectCardMetric }) {
  const { Icon, color } = metricIcon(metric.label);
  const TrendIcon = metric.trend === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <div className={cx(card, 'flex min-h-[140px] flex-col')}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[14px] text-gray-600 dark:text-gray-300">{metric.label}</p>
        <Icon className={cx('h-4 w-4 shrink-0', color)} aria-hidden="true" />
      </div>
      <p className="mt-auto pt-4 text-[26px] font-bold leading-tight text-gray-900 dark:text-white">{metric.value ?? '—'}</p>
      {metric.hint && (
        <p className={cx('mt-1 flex items-center gap-1 text-[12px]',
          metric.trend === 'down' ? 'text-rose-600' : metric.trend === 'up' ? 'text-emerald-600' : 'text-gray-500 dark:text-gray-400')}>
          {metric.trend && <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />}
          <span className={metric.trend ? 'text-gray-600 dark:text-gray-300' : undefined}>{metric.hint}</span>
        </p>
      )}
    </div>
  );
}

function RevenueTrend({ data, color }: { data: ProjectCardData['revenueTrend']; color: string }) {
  const points = data ?? [];
  const max = Math.max(...points.map(p => p.revenue), 0);
  const width = 600, height = 220, left = 48, bottom = 28, top = 10;
  const plotW = width - left - 10, plotH = height - bottom - top;
  const x = (i: number) => left + (points.length > 1 ? (i / (points.length - 1)) * plotW : plotW / 2);
  const y = (v: number) => top + plotH - (max > 0 ? (v / max) * plotH : 0);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.revenue).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1)},${top + plotH} L${x(0)},${top + plotH} Z` : '';
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(f => f * max);
  const gradientId = `rev-${color.replace('#', '')}`;

  return (
    <section className={card}>
      <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">Monthly Revenue Trend</h2>
      <p className="text-[13px] text-gray-500 dark:text-gray-400">Revenue over the past {points.length || 6} months</p>
      {points.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-gray-400">This project&apos;s endpoint doesn&apos;t report revenue yet.</p>
      ) : max === 0 ? (
        <p className="py-16 text-center text-[13px] text-gray-400">No revenue recorded in these {points.length} months.</p>
      ) : (
        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 h-auto w-full" role="img"
          aria-label={`Revenue: ${points.map(p => `${p.month} ₦${p.revenue.toLocaleString()}`).join(', ')}`}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.3" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          {ticks.map(t => (
            <g key={t}>
              <line x1={left} x2={width - 10} y1={y(t)} y2={y(t)} className="stroke-gray-100 dark:stroke-white/5" />
              <text x={left - 8} y={y(t) + 4} textAnchor="end" className="fill-gray-500 text-[11px]">₦{compactNumber(t)}</text>
            </g>
          ))}
          <path d={area} fill={`url(#${gradientId})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          {points.map((p, i) => (
            <text key={p.month + i} x={x(i)} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[11px]">{p.month}</text>
          ))}
        </svg>
      )}
    </section>
  );
}

function RankedBars({ title, subtitle, items, color }: {
  title: string; subtitle: string; items: { label: string; value: number }[]; color: string;
}) {
  const max = Math.max(...items.map(i => i.value), 1);
  return (
    <section className={card}>
      <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">{title}</h2>
      <p className="text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p>
      {items.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-gray-400">Nothing to show yet.</p>
      ) : (
        <ul className="mt-5 space-y-3">
          {items.map(item => (
            <li key={item.label} className="grid grid-cols-[minmax(90px,30%)_1fr_auto] items-center gap-3">
              <span className="truncate text-right text-[13px] text-gray-600 dark:text-gray-300" title={item.label}>{item.label}</span>
              <span className="h-7 rounded-md bg-gray-100 dark:bg-white/5">
                <span className="block h-full rounded-md" style={{ width: `${Math.max(2, (item.value / max) * 100)}%`, backgroundColor: color }} />
              </span>
              <span className="w-12 text-right text-[12px] font-medium text-gray-700 dark:text-gray-200">{item.value.toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RecordsTable({ title, columns, rows, empty }: {
  title: string; columns: string[]; rows: { cells: string[]; status?: string; tone?: ProjectRecordTone }[]; empty: string;
}) {
  const hasStatus = rows.some(r => r.status);
  return (
    <section className={card}>
      <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-gray-400">{empty}</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[13px]">
            <thead className="text-[12px] text-gray-500 dark:text-gray-400">
              <tr>
                {columns.map(c => <th key={c} className="py-2 pr-3 font-medium">{c}</th>)}
                {hasStatus && <th className="py-2 font-medium">Status</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((_, j) => (
                    <td key={j} className={cx('py-2.5 pr-3', j === 0 ? 'font-mono text-[12px] text-gray-500 dark:text-gray-400' : 'text-gray-800 dark:text-gray-100')}>
                      {row.cells[j] ?? ''}
                    </td>
                  ))}
                  {hasStatus && (
                    <td className="py-2.5">
                      {row.status && <span className={cx('rounded-md px-2 py-0.5 text-[12px] font-semibold', TONES[row.tone ?? 'neutral'])}>{row.status}</span>}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Approvals({ items }: { items: ProjectApprovalItem[] }) {
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white">Pending Approvals</h2>
        {items.length > 0 && <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[12px] font-semibold text-rose-600 dark:bg-rose-500/10">{items.length} pending</span>}
      </div>
      {items.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-gray-400">Nothing waiting for approval.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {items.slice(0, 3).map(item => (
            <li key={item.id} className={cx('rounded-xl border p-4',
              item.urgent ? 'border-rose-100 bg-rose-50/70 dark:border-rose-500/20 dark:bg-rose-500/10' : 'border-gray-100 bg-gray-50 dark:border-white/5 dark:bg-white/5')}>
              <p className="text-[14px] font-medium text-gray-900 dark:text-white">{item.title}</p>
              <p className="text-[12px] text-gray-600 dark:text-gray-300">{item.subtitle}</p>
              {item.urgent && <p className="mt-1 flex items-center gap-1 text-[12px] text-rose-600"><AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Urgent</p>}
            </li>
          ))}
        </ul>
      )}
      <Link href="/ceo/dashboard" className="mt-4 block rounded-lg border border-gray-200 py-2 text-center text-[13px] font-medium text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:text-gray-200 dark:hover:bg-white/5">
        Review on the dashboard
      </Link>
    </section>
  );
}

function ago(iso: string): string {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days} day${days === 1 ? '' : 's'} ago` : new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Project-wide events the project reports through its metrics endpoint. */
function Notifications({ items }: { items: ProjectNotification[] }) {
  return (
    <section className={card}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[16px] font-semibold text-gray-900 dark:text-white">
          <Bell className="h-4 w-4 text-gray-400" aria-hidden="true" /> Recent Notifications
        </h2>
        <Link href="/ceo/notifications" className="text-[13px] font-medium text-[#C89B3C] hover:underline">View all</Link>
      </div>
      {items.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-gray-400">No notifications from this project in the last 30 days.</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-white/5">
          {items.slice(0, 6).map(item => {
            const content = (
              <>
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-medium text-gray-900 dark:text-white">
                  {item.title}
                  {item.priority === 'high' && <span className="rounded bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">HIGH</span>}
                </p>
                {item.message && <p className="text-[13px] text-gray-600 dark:text-gray-300">{item.message}</p>}
                <p className="mt-0.5 text-[12px] text-gray-400">{ago(item.createdAt)}</p>
              </>
            );
            return (
              <li key={item.id} className="py-3">
                {item.link
                  ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="block rounded-lg hover:opacity-80">{content}</a>
                  : content}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const button = 'inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[13px] font-medium text-gray-800 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10';

export default function ProjectDetails({ project, category, icon, websiteUrl }: {
  project: ProjectCardData; category: string; icon: SiteIconName | null; websiteUrl: string;
}) {
  const color = project.color && /^#[0-9a-f]{6}$/i.test(project.color) ? project.color : '#C89B3C';
  const metrics = project.metrics.slice(0, 8);
  const top = project.topItems
    ?? (project.departments?.length
      ? {
        title: 'Team by Department',
        subtitle: 'Headcount per department',
        items: project.departments.map(d => ({ label: d.name, value: d.headcount })).sort((a, b) => b.value - a.value).slice(0, 6),
      }
      : null);
  const records = project.recentRecords
    ?? (project.tasks?.items?.length
      ? {
        title: 'Recent Tasks',
        columns: ['Task', 'Assignee', 'Due'],
        rows: project.tasks.items.slice(0, 6).map(t => ({
          cells: [t.task, t.assignee ?? '—', t.dueDate ?? '—'],
          status: t.status,
          tone: (t.status === 'Completed' ? 'success' : t.status === 'Overdue' ? 'danger' : t.status === 'In Progress' || t.status === 'In Review' ? 'info' : 'warning') as ProjectRecordTone,
        })),
      }
      : null);

  return (
    <div className="mx-auto max-w-[1376px] space-y-6">
      <Link href="/ceo/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Dashboard
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[20px]" style={{ backgroundColor: `${color}1f`, color }}>
            {icon ? <SiteIcon name={icon} /> : <span className="text-[16px] font-bold">{project.name.charAt(0)}</span>}
          </span>
          <div>
            <h1 className="text-[24px] font-semibold leading-tight text-gray-900 dark:text-white">{project.name}</h1>
            <p className="text-[15px] text-gray-600 dark:text-gray-300">{category || project.subtitle} — Executive Dashboard</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/ceo/projects/${encodeURIComponent(project.id)}/edit`} className={button}><Pencil className="h-4 w-4" aria-hidden="true" /> Edit project</Link>
          {project.adminUrl && <a href={project.adminUrl} target="_blank" rel="noopener noreferrer" className={button}><LayoutDashboard className="h-4 w-4" aria-hidden="true" /> Open admin</a>}
          {websiteUrl && <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={button}><ExternalLink className="h-4 w-4" aria-hidden="true" /> Visit site</a>}
          <RefreshButton color={color} />
        </div>
      </header>

      {project.status === 'error' && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          Couldn&apos;t reach this project&apos;s metrics endpoint{project.endpointError ? `: ${project.endpointError}` : '.'}
        </p>
      )}
      {project.stale && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          The endpoint isn&apos;t responding; showing the last data received{project.lastSyncedAt ? ` (${new Date(project.lastSyncedAt).toLocaleString()})` : ''}.
        </p>
      )}
      {!project.apiEndpoint && (
        <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-[13px] text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300">
          No metrics endpoint is set up for this project yet. <Link href={`/ceo/projects/${encodeURIComponent(project.id)}/edit`} className="font-semibold underline">Add one</Link> to see its live numbers here.
        </p>
      )}

      {metrics.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map(metric => <KpiCard key={metric.label} metric={metric} />)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueTrend data={project.revenueTrend} color={color} />
        {top
          ? <RankedBars title={top.title} subtitle={top.subtitle ?? ''} items={top.items} color={color} />
          : <RankedBars title="Top Items" subtitle="Sent by the project's metrics endpoint" items={[]} color={color} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {records
          ? <RecordsTable title={records.title} columns={records.columns} rows={records.rows} empty="No records yet." />
          : <RecordsTable title="Recent Records" columns={[]} rows={[]} empty="This project's endpoint doesn't send recent records yet." />}
        <Approvals items={project.approvals ?? []} />
      </div>

      <Notifications items={project.notifications ?? []} />

      {project.lastSyncedAt && (
        <p className="text-right text-[12px] text-gray-400">Last synced {new Date(project.lastSyncedAt).toLocaleString()}</p>
      )}
    </div>
  );
}
