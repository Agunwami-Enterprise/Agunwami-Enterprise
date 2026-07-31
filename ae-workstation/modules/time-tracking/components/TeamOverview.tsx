'use client';

import { useEffect, useState } from 'react';
import { subscribeLiveTeam, subscribeMonthlySummary, todayId, monthId } from '../services';
import type { TimeTrackingLiveDoc, DayStatus, MonthlySummaryDoc } from '../types';
import MonthlyCalendar from './MonthlyCalendar';

type Row = TimeTrackingLiveDoc & { uid: string };
type DisplayStatus = DayStatus | 'not-clocked-in';

const STATUS_META: Record<DisplayStatus, { label: string; bg: string; color: string }> = {
  active:           { label: 'Active',         bg: '#dcfce7', color: '#16a34a' },
  break:            { label: 'On Break',       bg: '#fef3c7', color: '#d97706' },
  'clocked-out':    { label: 'Clocked Out',    bg: '#f3f4f6', color: '#6b7280' },
  'not-clocked-in': { label: 'Not Clocked In', bg: '#f3f4f6', color: '#9ca3af' },
};

function displayStatus(row: Row, today: string): DisplayStatus {
  if (row.status !== 'clocked-out') return row.status;
  const clockedInToday = row.todayClockIn ? todayId(row.todayClockIn.toDate()) === today : false;
  return clockedInToday ? 'clocked-out' : 'not-clocked-in';
}

export default function TeamOverview() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);

  useEffect(() => subscribeLiveTeam(setRows), []);

  const today = todayId();
  const sorted = [...rows].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Team Overview</h2>
      <p className="mb-3 text-[11px] text-gray-400">Live clock-in status across the team</p>

      <div className="flex flex-col divide-y divide-gray-50 dark:divide-white/4">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-[12px] text-gray-400">No staff activity yet today</p>
        )}
        {sorted.map(row => {
          const meta = STATUS_META[displayStatus(row, today)];
          return (
            <button
              key={row.uid}
              onClick={() => setSelected(row)}
              className="flex items-center justify-between gap-3 py-3 text-left transition hover:bg-gray-50 dark:hover:bg-white/3"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white">{row.name}</p>
                <p className="truncate text-[11px] text-gray-400">{row.role} · {row.department}</p>
              </div>
              <span
                className="flex-shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold"
                style={{ backgroundColor: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
            </button>
          );
        })}
      </div>

      {selected && (
        <StaffCalendarModal row={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function StaffCalendarModal({ row, onClose }: { row: Row; onClose: () => void }) {
  const [summary, setSummary] = useState<MonthlySummaryDoc | null>(null);

  useEffect(() => subscribeMonthlySummary(row.uid, monthId(), setSummary), [row.uid]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-[#1e1e1e]"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-[14px] font-bold text-gray-800 dark:text-white">{row.name}</h3>
            <p className="text-[11px] text-gray-400">{row.role} · {row.department}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
          </button>
        </div>
        <MonthlyCalendar uid={row.uid} summary={summary} />
      </div>
    </div>
  );
}
