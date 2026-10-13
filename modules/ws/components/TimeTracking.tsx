'use client';

/**
 * Department workstation → Time Tracking (/ws/time-tracking), from the
 * design's tabs: Overview (clock in/out, this month's calendar, the team
 * today), Goals (attendance, hours and punctuality this month against your
 * shift) and Reports (a month's days, exportable). Clock-ins are AE Hub's
 * timeTracking records, the same ones its workstation uses.
 */

import { useEffect, useState } from 'react';
import { CalendarCheck, Clock3, Download, Target, Timer, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import ClockWidget from '@/modules/time-tracking/components/ClockWidget';
import MonthlyCalendar from '@/modules/time-tracking/components/MonthlyCalendar';
import { getDay, monthId, subscribeLiveTeam, subscribeMonthlySummary } from '@/modules/time-tracking/services';
import type { DayStatus, MonthlySummaryDoc } from '@/modules/time-tracking/types';
import { useDepartmentTeam } from '../data';
import { Card, Empty, PageHeader, Pill, StatTile, Tabs, btnGhost, downloadCsv, field } from './ui';

type Tab = 'overview' | 'goals' | 'reports';

const minutesOf = (hhmm: string) => (/^\d{2}:\d{2}$/.test(hhmm) ? Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3)) : null);

/** Weekdays from the 1st of the month up to today (or the whole month if it's past). */
function workdaysSoFar(month: string, now: Date): number {
  const [y, m] = month.split('-').map(Number);
  const last = now.getFullYear() === y && now.getMonth() + 1 === m ? now.getDate() : new Date(y, m, 0).getDate();
  let count = 0;
  for (let d = 1; d <= last; d++) {
    const day = new Date(y, m - 1, d).getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

function monthOptions(now: Date): Array<{ id: string; label: string }> {
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { id: monthId(d), label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) };
  });
}

const STATUS_PILL: Record<DayStatus, { label: string; tone: 'green' | 'amber' | 'gray' | 'blue' | 'red' }> = {
  onshift: { label: 'On shift', tone: 'green' }, onbreak: { label: 'On break', tone: 'amber' }, offshift: { label: 'Off shift', tone: 'gray' },
  onleave: { label: 'On leave', tone: 'blue' }, suspended: { label: 'Suspended', tone: 'red' },
};

export default function TimeTracking() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const { members } = useDepartmentTeam();
  const [tab, setTab] = useState<Tab>('overview');
  const [now, setNow] = useState<Date | null>(null);
  const [month, setMonth] = useState(() => monthId());
  const [summary, setSummary] = useState<MonthlySummaryDoc | null>(null);
  const [current, setCurrent] = useState<MonthlySummaryDoc | null>(null);
  const [live, setLive] = useState<Record<string, DayStatus>>({});
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const every = setInterval(() => setNow(new Date()), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);
  useEffect(() => (uid ? subscribeMonthlySummary(uid, monthId(), setCurrent) : undefined), [uid]);
  useEffect(() => (uid ? subscribeMonthlySummary(uid, month, setSummary) : undefined), [uid, month]);
  useEffect(() => subscribeLiveTeam(rows => {
    const map: Record<string, DayStatus> = {};
    for (const row of rows) map[row.uid] = row.status;
    setLive(map);
  }, () => setLive({})), []);

  const me = members.find(m => m.uid === uid);
  const shiftStart = me?.shiftStart || '09:00';
  const shiftEnd = me?.shiftEnd || '17:00';
  const shiftHours = (() => {
    const s = minutesOf(shiftStart), e = minutesOf(shiftEnd);
    return s !== null && e !== null && e > s ? (e - s) / 60 : 8;
  })();

  const thisMonth = monthId();
  const today = now ?? new Date(0);
  const workdays = now ? workdaysSoFar(thisMonth, today) : 0;
  const present = current?.daysPresent.length ?? current?.totalDaysWorked ?? 0;
  const hours = current?.totalHoursWorked ?? 0;
  const expectedHours = present * shiftHours;
  const avgIn = current?.averageClockIn || '';
  const lateBy = (() => {
    const a = minutesOf(avgIn.slice(0, 5)), s = minutesOf(shiftStart);
    return a !== null && s !== null ? a - s : null;
  })();

  const goals = [
    { label: 'Attendance', detail: `${present} of ${workdays} workdays this month`, pct: workdays ? Math.round((present / workdays) * 100) : 0, icon: CalendarCheck },
    { label: 'Hours', detail: `${hours.toFixed(1)} of ${expectedHours.toFixed(0)} hours for the days you worked (${shiftHours}h shifts)`, pct: expectedHours ? Math.round((hours / expectedHours) * 100) : 0, icon: Timer },
    { label: 'Punctuality', detail: avgIn ? `Average clock-in ${avgIn} for a ${shiftStart} start${lateBy !== null ? (lateBy > 5 ? ` (${lateBy} min late)` : ' (on time)') : ''}` : 'No clock-ins this month yet',
      pct: lateBy === null ? 0 : lateBy <= 5 ? 100 : Math.max(0, 100 - lateBy), icon: Clock3 },
  ];

  async function exportMonth() {
    if (!summary || !uid) return;
    setExporting(true);
    try {
      const days = [...summary.daysPresent].sort();
      const records = await Promise.all(days.map(id => getDay(uid, id).catch(() => null)));
      const time = (ts: { toDate(): Date } | null | undefined) => (ts ? ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '');
      downloadCsv(`time-${month}.csv`, ['Date', 'Clock in', 'Clock out', 'Worked (hours)', 'Breaks (minutes)'],
        days.map((id, i) => {
          const r = records[i];
          return [id, time(r?.clockIn), time(r?.clockOut), r ? (r.totalWorkedMinutes / 60).toFixed(2) : '', r ? r.totalBreakMinutes : ''];
        }));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Time Tracking" subtitle={`Your shift: ${shiftStart}–${shiftEnd}`} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Days Present" icon={CalendarCheck} iconClass="text-[#16a34a]" value={String(present)} sub={`Of ${workdays} workdays this month`} />
        <StatTile label="Hours This Month" icon={Timer} iconClass="text-[#2563eb]" value={hours.toFixed(1)} sub={present ? `${(hours / present).toFixed(1)} h a day on average` : 'No days yet'} />
        <StatTile label="Average Clock-in" icon={Clock3} iconClass="text-[#f59e0b]" value={avgIn || '—'} sub={`Shift starts ${shiftStart}`} />
        <StatTile label="Absent" icon={TrendingUp} iconClass="text-[#ef4444]" value={String(current?.daysAbsent.length ?? 0)} sub="Days marked absent this month" />
      </div>

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'overview', label: 'Overview' }, { id: 'goals', label: 'Goals' }, { id: 'reports', label: 'Reports' }]} />

      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
            <ClockWidget />
            {uid && <MonthlyCalendar uid={uid} summary={current} />}
          </div>
          <Card title="Team Today" icon={Users}>
            {members.length === 0 ? <Empty>No team members yet.</Empty> : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {members.map(m => {
                  const status = live[m.uid];
                  return (
                    <li key={m.uid} className="flex items-center justify-between gap-2 rounded-lg border border-[#e5e5e5] px-3 py-2 dark:border-white/10">
                      <span className="min-w-0 truncate text-[14px] text-[#292929] dark:text-gray-200">{m.name}</span>
                      {status ? <Pill label={STATUS_PILL[status].label} tone={STATUS_PILL[status].tone} /> : <Pill label="Not in yet" tone="gray" />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === 'goals' && (
        <Card title="This Month's Goals" icon={Target}>
          <ul className="space-y-5">
            {goals.map(goal => (
              <li key={goal.label}>
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-[15px] font-semibold text-[#292929] dark:text-white"><goal.icon className="h-4 w-4 text-[#f5bd02]" aria-hidden />{goal.label}</p>
                  <p className="text-[15px] font-semibold text-[#292929] dark:text-white">{Math.min(goal.pct, 100)}%</p>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10">
                  <div className={`h-full rounded-full ${goal.pct >= 90 ? 'bg-[#16a34a]' : goal.pct >= 70 ? 'bg-[#f5bd02]' : 'bg-[#ef4444]'}`} style={{ width: `${Math.min(goal.pct, 100)}%` }} />
                </div>
                <p className="mt-1 text-[13px] text-[#656565] dark:text-gray-400">{goal.detail}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'reports' && (
        <Card title="Monthly Report" icon={CalendarCheck} action={
          <div className="flex gap-2">
            <select className={`${field} w-48`} value={month} onChange={e => setMonth(e.target.value)} aria-label="Month">
              {(now ? monthOptions(today) : []).map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
            </select>
            <button className={btnGhost} onClick={() => void exportMonth()} disabled={!summary?.daysPresent.length || exporting}>
              <Download className="h-4 w-4" aria-hidden /> {exporting ? 'Exporting…' : 'Export'}
            </button>
          </div>
        }>
          {!summary ? <Empty>No time recorded for this month.</Empty> : (
            <>
              <dl className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Days worked', String(summary.totalDaysWorked)],
                  ['Hours', summary.totalHoursWorked.toFixed(1)],
                  ['Average clock-in', summary.averageClockIn || '—'],
                  ['Absent', String(summary.daysAbsent.length)],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-[#f5f5f5] p-3 dark:bg-white/5">
                    <dt className="text-[12px] text-[#8a8a8a]">{k}</dt>
                    <dd className="text-[18px] font-semibold text-[#292929] dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mb-2 text-[13px] font-semibold text-[#525252] dark:text-gray-300">Days present</p>
              {summary.daysPresent.length === 0 ? <Empty>None.</Empty> : (
                <div className="flex flex-wrap gap-1.5">
                  {[...summary.daysPresent].sort().map(d => <Pill key={d} label={new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} tone="green" />)}
                </div>
              )}
              {summary.daysAbsent.length > 0 && (
                <>
                  <p className="mb-2 mt-4 text-[13px] font-semibold text-[#525252] dark:text-gray-300">Days absent</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[...summary.daysAbsent].sort().map(d => <Pill key={d} label={new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })} tone="red" />)}
                  </div>
                </>
              )}
            </>
          )}
        </Card>
      )}
    </div>
  );
}
