'use client';

import { useState } from 'react';
import { getDay, todayId } from '../services';
import type { TimeTrackingDayDoc, MonthlySummaryDoc } from '../types';

interface Props {
  uid: string;
  summary: MonthlySummaryDoc | null;
}

function fmtTime(ts: { toDate(): Date }): string {
  return ts.toDate().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function fmtMins(mins: number): string {
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default function MonthlyCalendar({ uid, summary }: Props) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<TimeTrackingDayDoc | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = todayId();

  const presentSet = new Set(summary?.daysPresent ?? []);
  const absentSet = new Set(summary?.daysAbsent ?? []);

  function dateId(day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  async function openDay(id: string) {
    if (id > today) return;
    setSelected(id);
    setLoadingDetail(true);
    const d = await getDay(uid, id);
    setDetail(d);
    setLoadingDetail(false);
  }

  const cells: Array<{ day: number; id: string } | null> = [
    ...Array.from({ length: firstDow }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, id: dateId(i + 1) })),
  ];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">
          {cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6"
          >
            ‹
          </button>
          <button
            onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/6"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-gray-400">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => {
          if (!c) return <div key={`gap-${i}`} />;
          const isFuture = c.id > today;
          const isToday = c.id === today;
          const present = presentSet.has(c.id);
          const absent = absentSet.has(c.id);
          return (
            <button
              key={c.id}
              disabled={isFuture}
              onClick={() => openDay(c.id)}
              className={`aspect-square rounded-lg text-[11px] font-medium transition
                ${isToday ? 'ring-2 ring-[#f5bd02]' : ''}
                ${isFuture
                  ? 'cursor-default text-gray-300 dark:text-gray-600'
                  : present
                  ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-400'
                  : absent
                  ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/6'}`}
            >
              {c.day}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex gap-4 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-400" /> Present</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-300" /> Absent</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full ring-2 ring-[#f5bd02]" /> Today</span>
      </div>

      {selected && (
        <DayDetailModal
          dateId={selected}
          loading={loadingDetail}
          detail={detail}
          onClose={() => { setSelected(null); setDetail(null); }}
        />
      )}
    </div>
  );
}

function DayDetailModal({ dateId, loading, detail, onClose }: {
  dateId: string; loading: boolean; detail: TimeTrackingDayDoc | null; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:bg-[#1e1e1e]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[14px] font-bold text-gray-800 dark:text-white">{dateId}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>

        {loading ? (
          <p className="text-[12px] text-gray-400">Loading…</p>
        ) : !detail ? (
          <p className="text-[12px] text-gray-400">No record for this day.</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <DetailStat label="Clock In" value={fmtTime(detail.clockIn)} />
              <DetailStat label="Clock Out" value={detail.clockOut ? fmtTime(detail.clockOut) : '-'} />
              <DetailStat label="Worked" value={fmtMins(detail.totalWorkedMinutes)} />
              <DetailStat label="Break" value={fmtMins(detail.totalBreakMinutes)} />
            </div>
            {detail.autoClosedOut && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Auto clocked-out by the system at day end
              </p>
            )}
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">Sessions</p>
              <div className="space-y-1">
                {detail.sessions.map((s, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-2.5 py-1.5 text-[11px] dark:bg-[#2a2a2a]">
                    <span className={s.type === 'work' ? 'text-gray-700 dark:text-gray-200' : 'text-amber-600 dark:text-amber-400'}>
                      {s.type === 'work' ? 'Work' : 'Break'}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400">
                      {fmtTime(s.start)} – {s.end ? fmtTime(s.end) : 'now'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-[#2a2a2a]">
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}
